import type { Db, Document } from 'mongodb';

async function ensureCollection(db: Db, name: string, validator: Document): Promise<void> {
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
  if (exists) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    return;
  }
  await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
}

export async function applyRoomCommandsMigration(db: Db): Promise<void> {
  await ensureCollection(db, 'activeRoomMemberships', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['roomId', 'accountId', 'joinedAt'],
      properties: {
        roomId: { bsonType: 'string', minLength: 1 },
        accountId: { bsonType: 'string', minLength: 1 },
        joinedAt: { bsonType: 'date' },
      },
    },
  });
  await ensureCollection(db, 'roomCommands', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['accountId', 'commandId', 'payloadHash', 'type', 'issuedAt', 'expiresAt', 'outcome'],
      properties: {
        accountId: { bsonType: 'string', minLength: 1 },
        commandId: { bsonType: 'string', minLength: 1 },
        payloadHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
        type: { bsonType: 'string', minLength: 1 },
        issuedAt: { bsonType: 'date' },
        expiresAt: { bsonType: 'date' },
        outcome: { bsonType: 'object' },
      },
    },
  });
  await db.collection('activeRoomMemberships').createIndex(
    { roomId: 1 },
    { name: 'active_room_memberships' },
  );
  await db.collection('roomCommands').createIndexes([
    { key: { accountId: 1, commandId: 1 }, name: 'unique_account_command', unique: true },
    { key: { expiresAt: 1 }, name: 'command_expiry', expireAfterSeconds: 0 },
  ]);
}
