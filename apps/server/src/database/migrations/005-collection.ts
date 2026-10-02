import type { Db, Document } from 'mongodb';

const id = { bsonType: 'string', minLength: 1, maxLength: 128 };
const count = { bsonType: ['int', 'long'], minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const progress = { bsonType: 'object', required: ['sinceSr', 'sinceSsr'], properties: { sinceSr: count, sinceSsr: count } };

async function ensure(db: Db, name: string, schema: Document): Promise<void> {
  const validator = { $jsonSchema: { bsonType: 'object', ...schema } };
  if (await db.listCollections({ name }, { nameOnly: true }).hasNext()) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  } else await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
}

export async function applyCollectionMigration(db: Db): Promise<void> {
  await ensure(db, 'bannerVersions', {
    required: ['contentHash', 'config'], properties: { _id: id, contentHash: id, config: { bsonType: 'object' } },
  });
  await ensure(db, 'bannerProgress', {
    required: ['accountId', 'bannerId', 'sinceSr', 'sinceSsr'],
    properties: { accountId: id, bannerId: id, sinceSr: count, sinceSsr: count },
  });
  await ensure(db, 'pullReceipts', {
    required: ['accountId', 'requestId', 'payloadHash', 'receipt'],
    properties: { accountId: id, requestId: id, payloadHash: id, receipt: {
      bsonType: 'object', required: ['requestId', 'bannerVersion', 'count', 'cost', 'results', 'progress', 'committedAt', 'walletRevision'],
      properties: { requestId: id, bannerVersion: id, count: { enum: [1, 10] }, cost: { ...count, minimum: 1 },
        results: { bsonType: 'array', minItems: 1, maxItems: 10, items: {
          bsonType: 'object', required: ['itemId', 'item', 'rarity', 'duplicate', 'progress'],
          properties: { itemId: id, item: { bsonType: 'object' }, rarity: { enum: ['R', 'SR', 'SSR'] }, duplicate: { bsonType: 'bool' }, progress },
        } }, progress, committedAt: { bsonType: 'string' }, walletRevision: count },
    } },
  });
  await ensure(db, 'ownedCosmetics', {
    required: ['accountId', 'itemId', 'bannerVersion', 'requestId', 'acquiredAt'],
    properties: { accountId: id, itemId: id, bannerVersion: id, requestId: id, acquiredAt: { bsonType: 'date' } },
  });
  await ensure(db, 'equipment', {
    required: ['accountId', 'slot', 'itemId', 'revision'],
    properties: { accountId: id, slot: { enum: ['avatar', 'cardBack'] }, itemId: { bsonType: ['string', 'null'] }, revision: count },
  });
  await ensure(db, 'ticketLedger', {
    required: ['accountId', 'delta', 'reason', 'sourceId', 'occurredAt'],
    properties: { accountId: id, delta: { bsonType: ['int', 'long'], minimum: -Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER },
      reason: { enum: ['HAND_REWARD', 'PULL'] }, sourceId: id, occurredAt: { bsonType: 'date' } },
  });
  await db.collection('bannerProgress').createIndex({ accountId: 1, bannerId: 1 }, { unique: true, name: 'unique_account_banner' });
  await db.collection('pullReceipts').createIndex({ accountId: 1, requestId: 1 }, { unique: true, name: 'unique_account_pull' });
  await db.collection('ownedCosmetics').createIndex({ accountId: 1, itemId: 1 }, { unique: true, name: 'unique_account_item' });
  await db.collection('equipment').createIndex({ accountId: 1, slot: 1 }, { unique: true, name: 'unique_account_slot' });
}
