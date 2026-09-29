import { AuthorityLease } from '../src/authority/authorityLease';
import { abortPreviousRooms } from '../src/authority/startupCleanup';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { createTestDatabase } from './support/testDatabase';

describe('poker restart recovery', () => {
  it('aborts a stale session even without an open room and preserves committed hands', async () => {
    const database = await createTestDatabase();
    try {
      await applyMigrations(database.db);
      await database.db.collection<{ _id: string } & Record<string, unknown>>('gameSessions').insertOne({
        _id: 'stale-session', roomId: 'gone-room', status: 'ACTIVE',
        startedByAccountId: 'host', startCommandId: 'start-1', startPayloadHash: 'a'.repeat(64),
        authorityBootId: 'old-boot', authorityEpoch: 1,
        participants: [{ accountId: 'host', displayName: 'Host', seat: 0 },
          { accountId: 'guest', displayName: 'Guest', seat: 1 }],
        stacks: [990, 1010], firstHandId: 'hand-1', handNumber: 2,
        buttonSeat: 1, startedAt: new Date(), endingRequested: false,
      });
      await database.db.collection<{ _id: string } & Record<string, unknown>>('hands').insertMany([
        { _id: 'hand-1', sessionId: 'stale-session', roomId: 'gone-room', handNumber: 1,
          status: 'COMPLETED', revision: 1, createdAt: new Date(), result: { handId: 'hand-1' } },
        { _id: 'hand-2', sessionId: 'stale-session', roomId: 'gone-room', handNumber: 2,
          status: 'PENDING', revision: 0, createdAt: new Date() },
      ]);
      await database.db.collection<{ _id: string } & Record<string, unknown>>('activeParticipants').insertMany([
        { _id: 'host', accountId: 'host', roomId: 'gone-room', sessionId: 'stale-session', joinedAt: new Date() },
        { _id: 'guest', accountId: 'guest', roomId: 'gone-room', sessionId: 'stale-session', joinedAt: new Date() },
      ]);
      const lease = new AuthorityLease(database.db, 'replacement-boot');
      const token = await lease.acquire();
      if (!token) throw new Error('No authority');
      await new TransactionRunner(database.client).run((session) => abortPreviousRooms(database.db, lease, session, token));
      expect((await database.db.collection<{ _id: string; status: string }>('gameSessions').findOne({ _id: 'stale-session' }))?.status).toBe('ABORTED');
      expect((await database.db.collection<{ _id: string; status: string }>('hands').findOne({ _id: 'hand-1' }))?.status).toBe('COMPLETED');
      expect((await database.db.collection<{ _id: string; status: string }>('hands').findOne({ _id: 'hand-2' }))?.status).toBe('ABORTED');
      expect(await database.db.collection('activeParticipants').countDocuments()).toBe(0);
    } finally { await database.dispose(); }
  });
});
