import { Injectable } from '@nestjs/common';
import type { WalletView } from '@poker/contracts' with { 'resolution-mode': 'import' };

import { M3_REWARD_POLICY } from './rewardPolicy';
import { TicketsRepository } from './tickets.repository';

@Injectable()
export class TicketsService {
  public constructor(private readonly tickets: TicketsRepository) {}

  public async getWallet(accountId: string, now: Date): Promise<WalletView> {
    await this.tickets.ensureWallet(accountId);
    const utcDate = now.toISOString().slice(0, 10);
    const [wallet, earnedToday] = await this.tickets.readWallet(accountId, utcDate);
    const dailyCap = M3_REWARD_POLICY.dailyCap;
    return {
      balance: wallet.balance, revision: wallet.revision, utcDate,
      earnedToday, dailyCap, remainingToday: Math.max(0, dailyCap - earnedToday),
    };
  }
}
