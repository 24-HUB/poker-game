import { Inject, Injectable } from '@nestjs/common';
import type { CollectionView, CosmeticSlot, EquipmentView, HandEquipment } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { ClientSession, Db } from 'mongodb';
import { MONGO_DB, TRANSACTION_RUNNER } from '../../database/database.tokens';
import { TransactionRunner } from '../../database/transactionRunner';
import { findCosmetic, type BannerDocument } from '../gacha/catalogue';
import { GachaError, type OwnedCosmetic } from '../gacha/gacha.repository';

type EquipmentDocument = { accountId: string; slot: CosmeticSlot; itemId: string | null; revision: number };
export async function snapshotEquipment(db: Db, accounts: readonly string[], session: ClientSession): Promise<Record<string, HandEquipment>> {
  const result: Record<string, HandEquipment> = Object.create(null) as Record<string, HandEquipment>;
  for (const accountId of [...accounts].sort()) {
    const selected: HandEquipment = { avatar: null, cardBack: null };
    for (const row of await db.collection<EquipmentDocument>('equipment').find({ accountId }, { session }).toArray()) {
      if (!row.itemId) continue;
      const owned = await db.collection<OwnedCosmetic>('ownedCosmetics').findOne({ accountId, itemId: row.itemId }, { session });
      if (!owned) throw new Error('Equipment references an unowned cosmetic');
      const banner = await db.collection<BannerDocument>('bannerVersions').findOne({ _id: owned.bannerVersion }, { session });
      if (!banner) throw new Error('Equipment catalogue is missing');
      const item = findCosmetic(banner.config, row.itemId);
      if (item.slot !== row.slot) throw new Error('Invalid equipment slot');
      selected[row.slot] = item;
    }
    result[accountId] = selected;
  }
  return result;
}

@Injectable()
export class CollectionRepository {
  public constructor(@Inject(MONGO_DB) private readonly db: Db, @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner) {}
  public async equipment(accountId: string, session?: ClientSession): Promise<EquipmentView> {
    const view: EquipmentView = { avatar: { itemId: null, revision: 0 }, cardBack: { itemId: null, revision: 0 } };
    for (const row of await this.db.collection<EquipmentDocument>('equipment').find({ accountId }, session ? { session } : { readConcern: { level: 'snapshot' } }).toArray()) {
      view[row.slot] = { itemId: row.itemId, revision: row.revision };
    }
    return view;
  }
  public async collection(accountId: string, after?: string): Promise<CollectionView> {
    return this.transactions.run(async (session) => {
      const documents = await this.db.collection<OwnedCosmetic>('ownedCosmetics').find({ accountId,
        ...(after ? { itemId: { $gt: after } } : {}),
      }, { session }).sort({ itemId: 1 }).limit(101).toArray();
      const items: CollectionView['items'] = [];
      for (const owned of documents.slice(0, 100)) {
        const banner = await this.db.collection<BannerDocument>('bannerVersions').findOne({ _id: owned.bannerVersion }, { session });
        if (!banner) throw new Error('Owned catalogue is missing');
        items.push({ item: findCosmetic(banner.config, owned.itemId), acquiredAt: owned.acquiredAt.toISOString() });
      }
      return { items, nextCursor: documents.length > 100 ? documents[99]!.itemId : null, equipment: await this.equipment(accountId, session) };
    });
  }
  public async equip(accountId: string, slot: CosmeticSlot, itemId: string | null, expectedRevision: number): Promise<EquipmentView> {
    try { await this.transactions.run(async (session) => {
      if (itemId) {
        const owned = await this.db.collection<OwnedCosmetic>('ownedCosmetics').findOne({ accountId, itemId }, { session });
        if (!owned) throw new GachaError('NOT_OWNED', 'Only owned cosmetics can be equipped.');
        const banner = await this.db.collection<BannerDocument>('bannerVersions').findOne({ _id: owned.bannerVersion }, { session });
        if (!banner || findCosmetic(banner.config, itemId).slot !== slot) throw new GachaError('INVALID_SLOT', 'This cosmetic belongs to another slot.');
      }
      const equipment = this.db.collection<EquipmentDocument>('equipment');
      const prior = await equipment.findOne({ accountId, slot }, { session });
      if ((prior?.revision ?? 0) !== expectedRevision) throw new GachaError('REVISION_CONFLICT', 'Equipment changed in another tab. Refresh and try again.');
      const changed = await equipment.updateOne({ accountId, slot, revision: expectedRevision },
        { $set: { itemId }, $inc: { revision: 1 }, $setOnInsert: { accountId, slot } }, { session, upsert: !prior });
      if (changed.matchedCount + changed.upsertedCount !== 1) throw new GachaError('REVISION_CONFLICT', 'Equipment changed in another tab.');
    }); } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw new GachaError('REVISION_CONFLICT', 'Equipment changed in another tab. Refresh and try again.');
      }
      throw error;
    }
    return this.equipment(accountId);
  }
}
