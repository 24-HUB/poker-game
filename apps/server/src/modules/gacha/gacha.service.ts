import { HttpException, Injectable } from '@nestjs/common';
import type { PullRequest } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { AccountChanges } from '../tickets/accountChanges';
import { GachaError, GachaRepository } from './gacha.repository';

export function economyException(error: unknown): never {
  if (error instanceof GachaError) {
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'SERVICE_UNAVAILABLE' || error.code === 'MAINTENANCE' ? 503
      : error.code === 'NOT_OWNED' ? 403 : error.code === 'COMMAND_CONFLICT' || error.code === 'STALE_BANNER' || error.code === 'REVISION_CONFLICT' ? 409 : 400;
    throw new HttpException({ code: error.code, message: error.message }, status);
  }
  throw error;
}

@Injectable()
export class GachaService {
  public constructor(private readonly repository: GachaRepository, private readonly changes: AccountChanges) {}
  public async banner() { try { return await this.repository.banner(); } catch (error) { return economyException(error); } }
  public async receipt(accountId: string, requestId: string) {
    const receipt = await this.repository.findReceipt(accountId, requestId);
    if (!receipt) throw new HttpException({ code: 'NOT_FOUND', message: 'No committed receipt was found.' }, 404);
    return receipt;
  }
  public async pull(accountId: string, input: PullRequest) {
    try {
      const receipt = await this.repository.pull(accountId, input);
      this.changes.publish(accountId, receipt.walletRevision);
      return receipt;
    } catch (error) { return economyException(error); }
  }
}
