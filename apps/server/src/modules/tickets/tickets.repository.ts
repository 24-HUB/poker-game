import { Inject, Injectable } from '@nestjs/common';
import type { RewardReceipt } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { ClientSession, Db } from 'mongodb';

import { MONGO_DB } from '../../database/database.tokens';
import type { SettlementCandidate } from '../settlement/settlement.service';
import { calculateReward, M3_REWARD_POLICY } from './rewardPolicy';

export type WalletDocument = { _id: string; balance: number; revision: number; createdAt: Date; updatedAt: Date };
type DailyDocument = { accountId: string; utcDate: string; earned: number };
type LedgerDocument = { accountId: string; delta: number; reason: 'HAND_REWARD'; sourceId: string; occurredAt: Date };

@Injectable()
export class TicketsRepository {
  public constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  public async ensureWallet(accountId: string): Promise<void> {
    const now = new Date();
    await this.db.collection<WalletDocument>('ticketWallets').updateOne(
      { _id: accountId }, { $setOnInsert: { balance: 0, revision: 0, createdAt: now, updatedAt: now } }, { upsert: true },
    );
  }

  public async readWallet(accountId: string, utcDate: string): Promise<[WalletDocument, number]> {
    const wallet = await this.db.collection<WalletDocument>('ticketWallets').findOne({ _id: accountId });
    if (!wallet) throw new Error('Ticket wallet is missing');
    const daily = await this.db.collection<DailyDocument>('dailyEarnings').findOne({ accountId, utcDate });
    return [wallet, daily?.earned ?? 0];
  }

  public async walletRevision(accountId: string): Promise<number | null> {
    return (await this.db.collection<WalletDocument>('ticketWallets').findOne({ _id: accountId }))?.revision ?? null;
  }

  public async awardHand(candidate: SettlementCandidate, session: ClientSession): Promise<RewardReceipt[]> {
    if (candidate.rewardPolicyVersion !== M3_REWARD_POLICY.version) return [];
    const receipts: RewardReceipt[] = [];
    const accounts = [...candidate.participants].sort((a, b) => a.accountId.localeCompare(b.accountId));
    for (const participant of accounts) {
      const accountId = participant.accountId;
      const wallet = await this.db.collection<WalletDocument>('ticketWallets').findOneAndUpdate(
        { _id: accountId }, { $inc: { revision: 1 }, $set: { updatedAt: candidate.completedAt } },
        { session, returnDocument: 'after' },
      );
      if (!wallet) throw new Error('Ticket wallet is missing');
      const daily = await this.db.collection<DailyDocument>('dailyEarnings').findOne(
        { accountId, utcDate: candidate.completedDateUtc }, { session },
      );
      const computed = calculateReward({
        dealtIn: candidate.dealtInAccountIds?.includes(accountId) ?? false,
        manualAction: candidate.engine.manualActionAccountIds.includes(accountId),
        netChips: (candidate.engine.payouts[accountId] ?? 0) - (candidate.engine.contributions[accountId] ?? 0),
        earnedToday: daily?.earned ?? 0,
      }, M3_REWARD_POLICY);
      const amount = computed.grantedParticipation + computed.grantedBonus;
      const receipt: RewardReceipt = {
        handId: candidate.handId, accountId, policyVersion: M3_REWARD_POLICY.version,
        completedDateUtc: candidate.completedDateUtc, ...computed,
      };
      await this.db.collection<RewardReceipt>('rewardReceipts').insertOne(receipt, { session });
      if (amount > 0) {
        const updated = await this.db.collection<WalletDocument>('ticketWallets').updateOne(
          { _id: accountId, revision: wallet.revision }, { $inc: { balance: amount } }, { session },
        );
        if (updated.matchedCount !== 1) throw new Error('Ticket wallet changed during settlement');
        await this.db.collection<DailyDocument>('dailyEarnings').updateOne(
          { accountId, utcDate: candidate.completedDateUtc }, { $inc: { earned: amount } }, { session, upsert: true },
        );
        await this.db.collection<LedgerDocument>('ticketLedger').insertOne({
          accountId, delta: amount, reason: 'HAND_REWARD', sourceId: candidate.handId, occurredAt: candidate.completedAt,
        }, { session });
      }
      receipts.push(receipt);
    }
    return receipts;
  }
}
