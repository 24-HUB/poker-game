import type { Db, Document } from 'mongodb';

async function ensureCollection(db: Db, name: string, validator: Document): Promise<void> {
  if (await db.listCollections({ name }, { nameOnly: true }).hasNext()) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
  }
}

const safeChips = { bsonType: ['int', 'long'], minimum: 0, maximum: Number.MAX_SAFE_INTEGER };

export async function applyPokerMigration(db: Db): Promise<void> {
  await ensureCollection(db, 'gameSessions', { $jsonSchema: {
    bsonType: 'object',
    required: ['roomId', 'status', 'startedByAccountId', 'startCommandId', 'startPayloadHash',
      'authorityBootId', 'authorityEpoch', 'participants', 'stacks', 'firstHandId', 'handNumber',
      'buttonSeat', 'startedAt', 'endingRequested'],
    properties: {
      roomId: { bsonType: 'string', minLength: 1 }, status: { enum: ['ACTIVE', 'COMPLETED', 'ABORTED'] },
      startedByAccountId: { bsonType: 'string', minLength: 1 }, startCommandId: { bsonType: 'string', minLength: 1 },
      startPayloadHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
      authorityBootId: { bsonType: 'string', minLength: 1 }, authorityEpoch: safeChips,
      participants: { bsonType: 'array', minItems: 2, maxItems: 6, items: { bsonType: 'object',
        required: ['accountId', 'displayName', 'seat'], properties: {
          accountId: { bsonType: 'string', minLength: 1 },
          displayName: { bsonType: 'string', minLength: 1 },
          seat: { bsonType: ['int', 'long'], minimum: 0, maximum: 5 },
        } } },
      stacks: { bsonType: 'array', minItems: 2, maxItems: 6, items: safeChips },
      firstHandId: { bsonType: 'string', minLength: 1 }, handNumber: { bsonType: ['int', 'long'], minimum: 1 },
      buttonSeat: { bsonType: ['int', 'long'], minimum: 0, maximum: 5 },
      startedAt: { bsonType: 'date' }, endingRequested: { bsonType: 'bool' },
      endedAt: { bsonType: 'date' },
    },
  } });
  await ensureCollection(db, 'hands', { $jsonSchema: {
    bsonType: 'object', required: ['sessionId', 'roomId', 'handNumber', 'status', 'revision', 'createdAt'],
    properties: {
      sessionId: { bsonType: 'string', minLength: 1 }, roomId: { bsonType: 'string', minLength: 1 },
      handNumber: { bsonType: ['int', 'long'], minimum: 1 },
      status: { enum: ['PENDING', 'SETTLING', 'COMPLETED', 'ABORTED'] }, revision: safeChips,
      createdAt: { bsonType: 'date' }, completedAt: { bsonType: 'date' }, result: { bsonType: 'object' },
    },
  } });
  await ensureCollection(db, 'activeParticipants', { $jsonSchema: {
    bsonType: 'object', required: ['accountId', 'roomId', 'sessionId', 'joinedAt'],
    properties: {
      accountId: { bsonType: 'string', minLength: 1 }, roomId: { bsonType: 'string', minLength: 1 },
      sessionId: { bsonType: 'string', minLength: 1 }, joinedAt: { bsonType: 'date' },
    },
  } });
  await db.collection('gameSessions').createIndexes([
    { key: { startedByAccountId: 1, startCommandId: 1 }, name: 'unique_session_start', unique: true },
    { key: { roomId: 1, status: 1 }, name: 'room_active_session' },
  ]);
  await db.collection('hands').createIndex({ sessionId: 1, handNumber: 1 }, { name: 'unique_session_hand', unique: true });
  await db.collection('activeParticipants').createIndex({ sessionId: 1 }, { name: 'session_participants' });
}
