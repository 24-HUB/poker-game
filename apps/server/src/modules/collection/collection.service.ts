import { Injectable } from '@nestjs/common';
import type { CosmeticSlot } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { AccountChanges } from '../tickets/accountChanges';
import { economyException } from '../gacha/gacha.service';
import { CollectionRepository } from './collection.repository';

@Injectable()
export class CollectionService {
  public constructor(private readonly repository: CollectionRepository, private readonly changes: AccountChanges) {}
  public collection(accountId: string, after?: string) { return this.repository.collection(accountId, after); }
  public equipment(accountId: string) { return this.repository.equipment(accountId); }
  public async equip(accountId: string, slot: CosmeticSlot, itemId: string | null, revision: number) {
    try {
      const equipment = await this.repository.equip(accountId, slot, itemId, revision);
      this.changes.publish(accountId, equipment[slot].revision);
      return equipment;
    } catch (error) { return economyException(error); }
  }
}
