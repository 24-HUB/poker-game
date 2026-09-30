import { MongoServerError } from 'mongodb';

import { applyMigrations } from '../src/database/migrate';
import { applyFoundationMigration } from '../src/database/migrations/001-foundation';
import { TransactionRunner } from '../src/database/transactionRunner';
import { createTestDatabase } from './support/testDatabase';

describe('database persistence', () => {
  it('rollsBackBothWrites', async () => {
    const testDatabase = await createTestDatabase();
    const runner = new TransactionRunner(testDatabase.client);

    try {
      await expect(runner.run(async (session) => {
        await testDatabase.db.collection('first').insertOne({ value: 1 }, { session });
        await testDatabase.db.collection('second').insertOne({ value: 2 }, { session });
        throw new Error('deliberate rollback');
      })).rejects.toThrow('deliberate rollback');

      await expect(testDatabase.db.collection('first').countDocuments()).resolves.toBe(0);
      await expect(testDatabase.db.collection('second').countDocuments()).resolves.toBe(0);
    } finally {
      await testDatabase.dispose();
    }
  });

  it('rejectsDuplicateOccupiedSeat', async () => {
    const testDatabase = await createTestDatabase();

    try {
      await applyMigrations(testDatabase.db);
      const memberships = testDatabase.db.collection('roomMemberships');
      await memberships.insertOne({ roomId: 'room-1', accountId: 'a', seat: 0, joinedAt: new Date() });
      await expect(memberships.insertOne({ roomId: 'room-1', accountId: 'b', seat: 0, joinedAt: new Date() }))
        .rejects.toMatchObject<Partial<MongoServerError>>({ code: 11000 });
      await memberships.insertMany([
        { roomId: 'room-1', accountId: 'c', seat: null, joinedAt: new Date() },
        { roomId: 'room-1', accountId: 'd', seat: null, joinedAt: new Date() },
      ]);
    } finally {
      await testDatabase.dispose();
    }
  });

  it('appliesMigrationsIdempotently', async () => {
    const testDatabase = await createTestDatabase();

    try {
      await applyMigrations(testDatabase.db);
      await applyMigrations(testDatabase.db);
      await expect(testDatabase.db.collection('schemaMigrations').countDocuments()).resolves.toBe(3);
      await expect(testDatabase.db.listCollections({ name: 'roomCommands' }).hasNext()).resolves.toBe(true);
      await expect(testDatabase.db.listCollections({ name: 'activeRoomMemberships' }).hasNext()).resolves.toBe(true);
      await expect(testDatabase.db.listCollections({ name: 'gameSessions' }).hasNext()).resolves.toBe(true);
    } finally {
      await testDatabase.dispose();
    }
  });

  it('adds room command persistence to a database that already applied foundation version 1', async () => {
    const testDatabase = await createTestDatabase();

    try {
      await applyFoundationMigration(testDatabase.db);
      await testDatabase.db.collection<{ _id: number; appliedAt: Date }>('schemaMigrations')
        .insertOne({ _id: 1, appliedAt: new Date() });

      await applyMigrations(testDatabase.db);

      await expect(testDatabase.db.collection('schemaMigrations').countDocuments()).resolves.toBe(3);
      await expect(testDatabase.db.listCollections({ name: 'roomCommands' }).hasNext()).resolves.toBe(true);
      await expect(testDatabase.db.listCollections({ name: 'gameSessions' }).hasNext()).resolves.toBe(true);
    } finally {
      await testDatabase.dispose();
    }
  });

  it('rejectsStandaloneMongo', async () => {
    const testDatabase = await createTestDatabase('mongodb://127.0.0.1:27019/?directConnection=true');

    try {
      await expect(new TransactionRunner(testDatabase.client).run(async () => undefined))
        .rejects.toThrow('MongoDB replica set transactions are required');
    } finally {
      await testDatabase.dispose();
    }
  });
});
