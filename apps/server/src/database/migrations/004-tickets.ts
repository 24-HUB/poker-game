import type { Db, Document } from 'mongodb';

const count = { bsonType: ['int', 'long'], minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const id = { bsonType: 'string', minLength: 1 };

async function ensureCollection(db: Db, name: string, validator: Document): Promise<void> {
  if (await db.listCollections({ name }, { nameOnly: true }).hasNext()) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
  }
}

export async function applyTicketsMigration(db: Db): Promise<void> {
  await ensureCollection(db, 'ticketWallets', { $jsonSchema: {
    bsonType: 'object', required: ['balance', 'revision', 'createdAt', 'updatedAt'],
    properties: { _id: id, balance: count, revision: count, createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' } },
  } });
  await ensureCollection(db, 'dailyEarnings', { $jsonSchema: {
    bsonType: 'object', required: ['accountId', 'utcDate', 'earned'],
    properties: { accountId: id, utcDate: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, earned: count },
  } });
  await ensureCollection(db, 'ticketLedger', { $jsonSchema: {
    bsonType: 'object', required: ['accountId', 'delta', 'reason', 'sourceId', 'occurredAt'],
    properties: { accountId: id, delta: { bsonType: ['int', 'long'], minimum: -Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER },
      reason: { enum: ['HAND_REWARD'] }, sourceId: id, occurredAt: { bsonType: 'date' } },
  } });
  await ensureCollection(db, 'rewardReceipts', { $jsonSchema: {
    bsonType: 'object', required: ['handId', 'accountId', 'policyVersion', 'completedDateUtc', 'qualified',
      'reason', 'requestedParticipation', 'requestedBonus', 'grantedParticipation', 'grantedBonus'],
    properties: { handId: id, accountId: id, policyVersion: count, completedDateUtc: { bsonType: 'string' },
      qualified: { bsonType: 'bool' }, reason: { enum: ['AWARDED', 'NOT_DEALT_IN', 'NO_MANUAL_ACTION', 'DAILY_CAP'] },
      requestedParticipation: count, requestedBonus: count, grantedParticipation: count, grantedBonus: count },
  } });
  await db.collection('dailyEarnings').createIndex({ accountId: 1, utcDate: 1 }, { unique: true, name: 'unique_daily_earning' });
  await db.collection('ticketLedger').createIndex({ accountId: 1, reason: 1, sourceId: 1 }, { unique: true, name: 'unique_ticket_source' });
  await db.collection('rewardReceipts').createIndex({ handId: 1, accountId: 1 }, { unique: true, name: 'unique_hand_account_reward' });
}
