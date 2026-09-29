import { randomUUID } from 'node:crypto';

import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { RoomCommandCache } from '../src/modules/rooms/roomCommandCache';
import { RoomRepository } from '../src/modules/rooms/room.repository';
import { RoomRegistry } from '../src/modules/rooms/roomRegistry';
import { RoomService, type RoomContext } from '../src/modules/rooms/room.service';
import { SessionRepository } from '../src/modules/rooms/session.repository';
import { SessionService } from '../src/modules/rooms/session.service';
import { SettlementRepository } from '../src/modules/settlement/settlement.repository';
import { SettlementService, type SettlementCandidate } from '../src/modules/settlement/settlement.service';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('atomic chip settlement', () => {
  let database: TestDatabase;
  let authority: AuthorityLease;
  let rooms: RoomService;
  let settlement: SettlementService;
  let candidate: SettlementCandidate;

  const context = (accountId: string): RoomContext => ({
    identity: { accountId, displayName: accountId, sessionId: `${accountId}-session`, expiresAt: new Date(Date.now() + 60_000) },
    connectionId: `${accountId}-tab`,
  });

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    authority = new AuthorityLease(database.db, 'settlement-test-boot');
    const token = await authority.acquire();
    if (!token) throw new Error('Expected authority');
    authority.markReady(token);
    const registry = new RoomRegistry();
    rooms = new RoomService(new RoomRepository(database.db, new TransactionRunner(database.client), authority),
      registry, new RoomCommandCache(), authority);
    const sessions = new SessionService(new SessionRepository(database.db, new TransactionRunner(database.client), authority),
      registry, authority);
    const issuedAt = new Date().toISOString();
    const created = await rooms.execute(context('host'), {
      type: 'room:create', title: 'Poker', commandId: randomUUID(),
      authorityBootId: token.bootId, issuedAt,
    });
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    const roomId = created.data.room.roomId;
    const joined = await rooms.execute(context('guest'), {
      type: 'room:join', token: created.data.invitation.token, commandId: randomUUID(),
      authorityBootId: token.bootId, issuedAt,
    });
    if (joined.error) throw new Error('Expected guest');
    const runtime = await registry.enqueue(roomId, () => sessions.startInQueue(context('host'), {
      type: 'session:start', roomId, controlEpoch: 1, commandId: randomUUID(),
      authorityBootId: token.bootId, issuedAt,
    }));
    candidate = {
      roomId, sessionId: runtime.sessionId, handId: runtime.firstHandId, handNumber: 1,
      authority: token, expectedRevision: 0, rulesVersion: 1,
      completedAt: new Date('2026-09-29T07:00:00.000Z'), completedDateUtc: '2026-09-29',
      participants: runtime.participants,
      engine: {
        contributions: { host: 10, guest: 20 }, payouts: { host: 0, guest: 30 },
        finalStacks: [990, 1010], manualActionAccountIds: ['host'], revealedCards: [],
        pots: [{ amount: 20, eligibleAccountIds: ['guest'], winners: ['guest'], payouts: [{ accountId: 'guest', amount: 20 }] },
          { amount: 10, eligibleAccountIds: ['guest'], winners: ['guest'], payouts: [{ accountId: 'guest', amount: 10 }] }],
      },
    };
    settlement = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client), authority));
  });

  afterEach(async () => {
    rooms.dispose();
    await database.dispose();
  });

  it('returns the same receipt on double settlement and rejects a mismatched candidate', async () => {
    const first = await settlement.commit(candidate);
    const second = await settlement.commit(candidate);
    expect(second).toEqual(first);
    expect(first.payouts).toEqual([{ accountId: 'host', amount: 0 }, { accountId: 'guest', amount: 30 }]);
    expect(await database.db.collection('hands').countDocuments({ status: 'COMPLETED' })).toBe(1);
    await expect(settlement.commit({ ...candidate, engine: { ...candidate.engine, payouts: { host: 30, guest: 0 } } }))
      .rejects.toMatchObject({ code: 'SETTLEMENT_CONFLICT' });
  });

  it('rolls back the hand when updating session stacks fails', async () => {
    const invalid = { ...candidate, engine: { ...candidate.engine, finalStacks: [990, -1] } };
    await expect(settlement.commit(invalid)).rejects.toThrow();
    expect((await database.db.collection<{ _id: string; status: string }>('hands')
      .findOne({ _id: candidate.handId }))?.status).toBe('PENDING');
    expect((await database.db.collection<{ _id: string; stacks: number[] }>('gameSessions')
      .findOne({ _id: candidate.sessionId }))?.stacks).toEqual([1000, 1000]);
  });

  it('resolves a committed receipt after its reply is lost', async () => {
    const committed = await settlement.commit(candidate);
    const replacement = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client), authority));
    const recovered = await replacement.commit(candidate);
    expect(recovered).toEqual(committed);
    expect((await database.db.collection<{ _id: string; stacks: number[] }>('gameSessions')
      .findOne({ _id: candidate.sessionId }))?.stacks).toEqual([990, 1010]);
    expect(await database.db.collection('hands').countDocuments({ status: 'COMPLETED' })).toBe(1);
  });
});
