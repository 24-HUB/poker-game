import type { Db, Document } from 'mongodb';

async function ensureCollection(db: Db, name: string, validator: Document): Promise<void> {
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
  if (exists) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    return;
  }

  await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
}

export async function applyFoundationMigration(db: Db): Promise<void> {
  await ensureCollection(db, 'rooms', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['hostAccountId', 'title', 'status', 'revision', 'createdAt', 'expiresAt'],
      properties: {
        hostAccountId: { bsonType: 'string', minLength: 1 },
        title: { bsonType: 'string', minLength: 1, maxLength: 24 },
        status: { enum: ['OPEN', 'CLOSED'] },
        revision: { bsonType: ['int', 'long'], minimum: 0 },
        invitationHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
        invitationExpiresAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        expiresAt: { bsonType: 'date' },
      },
    },
  });

  await ensureCollection(db, 'roomMemberships', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['roomId', 'accountId', 'seat', 'joinedAt'],
      properties: {
        roomId: { bsonType: 'string', minLength: 1 },
        accountId: { bsonType: 'string', minLength: 1 },
        seat: { bsonType: ['int', 'null'], minimum: 0, maximum: 5 },
        controllerEpoch: { bsonType: ['int', 'long'], minimum: 0 },
        joinedAt: { bsonType: 'date' },
        leftAt: { bsonType: ['date', 'null'] },
      },
    },
  });

  await ensureCollection(db, 'authorityLeases', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['ownerBootId', 'epoch', 'revision', 'expiresAt'],
      properties: {
        ownerBootId: { bsonType: 'string', minLength: 1 },
        epoch: { bsonType: ['int', 'long'], minimum: 1 },
        revision: { bsonType: ['int', 'long'], minimum: 0 },
        expiresAt: { bsonType: 'date' },
      },
    },
  });

  await db.collection('rooms').createIndexes([
    { key: { invitationHash: 1 }, name: 'unique_active_invitation', unique: true, partialFilterExpression: { invitationHash: { $type: 'string' } } },
    { key: { status: 1, expiresAt: 1 }, name: 'status_expiry' },
  ]);
  await db.collection('roomMemberships').createIndexes([
    { key: { roomId: 1, accountId: 1 }, name: 'unique_room_account', unique: true },
    { key: { roomId: 1, seat: 1 }, name: 'unique_occupied_seat', unique: true, partialFilterExpression: { seat: { $type: 'int' } } },
    { key: { accountId: 1, leftAt: 1 }, name: 'account_memberships' },
  ]);
}
