import { Inject, Injectable } from '@nestjs/common';
import type { CommittedHandResult } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { ClientSession, Db } from 'mongodb';

import { AuthorityLease } from '../../authority/authorityLease';
import { MONGO_DB, TRANSACTION_RUNNER } from '../../database/database.tokens';
import { TransactionRunner } from '../../database/transactionRunner';
import { SettlementError, type SettlementCandidate } from './settlement.service';

type HandDocument = {
  _id: string; sessionId: string; roomId: string; handNumber: number;
  status: 'PENDING' | 'SETTLING' | 'COMPLETED' | 'ABORTED'; revision: number;
  candidateHash?: string; result?: CommittedHandResult; completedAt?: Date;
};
type SessionDocument = { _id: string; roomId: string; handNumber: number; status: 'ACTIVE' | 'COMPLETED' | 'ABORTED'; stacks: number[] };

@Injectable()
export class SettlementRepository {
  public constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    private readonly authority: AuthorityLease,
  ) {}

  public async findCommitted(handId: string): Promise<{ candidateHash: string; result: CommittedHandResult } | null> {
    const hand = await this.db.collection<HandDocument>('hands').findOne(
      { _id: handId, status: 'COMPLETED' },
      { readConcern: { level: 'majority' }, readPreference: 'primary' },
    );
    return hand?.candidateHash && hand.result
      ? { candidateHash: hand.candidateHash, result: hand.result } : null;
  }

  public async commit(candidate: SettlementCandidate, hash: string,
    result: CommittedHandResult): Promise<CommittedHandResult> {
    return this.transactions.run(async (session) => this.commitTransaction(candidate, hash, result, session));
  }

  private async commitTransaction(candidate: SettlementCandidate, hash: string,
    result: CommittedHandResult, session: ClientSession): Promise<CommittedHandResult> {
    const existing = await this.db.collection<HandDocument>('hands').findOne({ _id: candidate.handId }, { session });
    if (!existing) throw new SettlementError('HAND_NOT_FOUND', 'The hand no longer exists.');
    if (existing.status === 'COMPLETED') {
      if (existing.candidateHash !== hash || !existing.result) {
        throw new SettlementError('SETTLEMENT_CONFLICT', 'The hand has a different committed result.');
      }
      return existing.result;
    }
    await this.authority.fence(session, candidate.authority);
    const updated = await this.db.collection<HandDocument>('hands').updateOne({
      _id: candidate.handId, sessionId: candidate.sessionId, roomId: candidate.roomId,
      handNumber: candidate.handNumber, revision: candidate.expectedRevision,
      status: { $in: ['PENDING', 'SETTLING'] },
    }, { $set: { status: 'COMPLETED', candidateHash: hash, result, completedAt: candidate.completedAt },
      $inc: { revision: 1 } }, { session });
    if (updated.matchedCount !== 1) throw new SettlementError('STALE_STATE', 'The hand changed before settlement.');
    const stacks = candidate.participants.map((participant, index) => ({
      accountId: participant.accountId, amount: candidate.engine.finalStacks[index],
    }));
    const sessionUpdate = await this.db.collection<SessionDocument>('gameSessions').updateOne({
      _id: candidate.sessionId, roomId: candidate.roomId, status: 'ACTIVE', handNumber: candidate.handNumber,
    }, { $set: { stacks: stacks.map(({ amount }) => amount!) } }, { session });
    if (sessionUpdate.matchedCount !== 1) throw new SettlementError('SESSION_NOT_ACTIVE', 'The session changed before settlement.');
    return result;
  }
}
