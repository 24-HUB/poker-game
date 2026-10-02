import { randomUUID } from 'node:crypto';
import type { Db, Document } from 'mongodb';

import { AuthorityLease } from '../src/authority/authorityLease';
import { abortPreviousRooms } from '../src/authority/startupCleanup';
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
import { TicketsRepository } from '../src/modules/tickets/tickets.repository';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { GachaRepository } from '../src/modules/gacha/gacha.repository';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('atomic chip settlement', () => {
  type StringIdDocument = Document & { _id: string };
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
    settlement = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client), authority,
      new TicketsRepository(database.db)));
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
    const replacement = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client), authority,
      new TicketsRepository(database.db)));
    const recovered = await replacement.commit(candidate);
    expect(recovered).toEqual(committed);
    expect((await database.db.collection<{ _id: string; stacks: number[] }>('gameSessions')
      .findOne({ _id: candidate.sessionId }))?.stacks).toEqual([990, 1010]);
    expect(await database.db.collection('hands').countDocuments({ status: 'COMPLETED' })).toBe(1);
  });

  it('credits qualifying participants once with a durable wallet, ledger and receipt', async () => {
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    candidate.engine.manualActionAccountIds = ['host', 'guest'];
    const first = await settlement.commit(candidate);
    const replay = await settlement.commit(candidate);
    expect(replay).toEqual(first);
    expect(first.rewardReceipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountId: 'host', grantedParticipation: 1, grantedBonus: 0 }),
      expect.objectContaining({ accountId: 'guest', grantedParticipation: 1, grantedBonus: 1 }),
    ]));
    expect(await database.db.collection<StringIdDocument>('ticketWallets').findOne({ _id: 'host' })).toMatchObject({ balance: 1, revision: 1 });
    expect(await database.db.collection<StringIdDocument>('ticketWallets').findOne({ _id: 'guest' })).toMatchObject({ balance: 2, revision: 1 });
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(2);
    expect(await database.db.collection('ticketLedger').countDocuments()).toBe(2);
    expect((await database.db.collection('dailyEarnings').findOne({ accountId: 'guest' }))?.earned).toBe(2);
  });

  it('reconciles an uncertain committed reward using the frozen pre-midnight date', async () => {
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    candidate.completedAt = new Date('2026-09-29T23:59:59.999Z');
    class LostCommitReply extends TransactionRunner {
      public override async run<T>(work: Parameters<TransactionRunner['run']>[0]): Promise<T> {
        await super.run(work);
        throw new Error('Lost commit response after midnight');
      }
    }
    const uncertain = new SettlementService(new SettlementRepository(database.db, new LostCommitReply(database.client),
      authority, new TicketsRepository(database.db)));
    const result = await uncertain.commit(candidate);
    expect(result.rewardReceipts?.[0]).toMatchObject({ completedDateUtc: '2026-09-29' });
    expect(await settlement.commit(candidate)).toEqual(result);
    expect(await database.db.collection('dailyEarnings').countDocuments({ utcDate: '2026-09-29' })).toBe(1);
    expect(await database.db.collection('dailyEarnings').countDocuments({ utcDate: '2026-09-30' })).toBe(0);
    expect(await database.db.collection('ticketLedger').countDocuments()).toBe(1);
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(2);
  });

  it('leaves historical M2 settlements without wallets or backfilled rewards', async () => {
    const result = await settlement.commit(candidate);
    expect(result.rewardReceipts).toBeUndefined();
    expect(await settlement.commit(candidate)).toEqual(result);
    expect(await database.db.collection('ticketWallets').countDocuments()).toBe(0);
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(0);
  });

  it.each([1, 2, 3, 4, 5])('rolls back after ticket write %i and then retries exactly once', async (failurePoint) => {
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    let writes = 0;
    const faultDb = new Proxy(database.db, {
      get(target, property) {
        if (property !== 'collection') {
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        }
        return (name: string) => new Proxy(target.collection(name), {
          get(collection, method) {
            const value = Reflect.get(collection, method);
            if (typeof value !== 'function') return value;
            return async (...args: unknown[]) => {
              const result: unknown = await Reflect.apply(value, collection, args);
              const options = args.at(-1) as { session?: unknown } | undefined;
              if (options?.session && ['findOneAndUpdate', 'insertOne', 'updateOne'].includes(String(method))) {
                writes += 1;
                if (writes === failurePoint) throw new Error('Injected ticket write fault');
              }
              return result;
            };
          },
        });
      },
    }) as Db;
    const failing = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client),
      authority, new TicketsRepository(faultDb)));
    await expect(failing.commit(candidate)).rejects.toThrow('Injected ticket write fault');
    expect(await database.db.collection('ticketLedger').countDocuments()).toBe(0);
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(0);
    expect(await database.db.collection('dailyEarnings').countDocuments()).toBe(0);
    expect(await database.db.collection('ticketWallets').find({ balance: { $ne: 0 } }).toArray()).toEqual([]);
    expect(await database.db.collection('hands').countDocuments({ status: 'COMPLETED' })).toBe(0);
    await settlement.commit(candidate);
    expect(await database.db.collection('ticketLedger').countDocuments()).toBe(1);
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(2);
  });

  it('rolls back ticket effects when the hand transaction aborts', async () => {
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    candidate.engine.manualActionAccountIds = ['host', 'guest'];
    await database.db.collection<StringIdDocument>('gameSessions').updateOne({ _id: candidate.sessionId }, { $set: { status: 'ABORTED' } });
    await expect(settlement.commit(candidate)).rejects.toMatchObject({ code: 'SESSION_NOT_ACTIVE' });
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(0);
    expect(await database.db.collection('ticketLedger').countDocuments()).toBe(0);
    expect(await database.db.collection<StringIdDocument>('ticketWallets').findOne({ _id: 'host' })).toMatchObject({ balance: 0 });
  });

  it.each([false, true])('preserves only committed rewards across authority replacement (committed=%s)', async (committed) => {
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    const result = committed ? await settlement.commit(candidate) : null;
    await database.db.collection<StringIdDocument>('authorityLeases').updateOne({ _id: 'backend' }, { $set: { expiresAt: new Date(0) } });
    const replacement = new AuthorityLease(database.db, 'replacement');
    const token = await replacement.acquire();
    if (!token) throw new Error('Expected replacement authority');
    await new TransactionRunner(database.client).run((session) => abortPreviousRooms(database.db, replacement, session, token));
    if (committed) expect(await settlement.commit(candidate)).toEqual(result);
    else await expect(settlement.commit(candidate)).rejects.toMatchObject({ code: 'AUTHORITY_LOST' });
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(committed ? 2 : 0);
    expect(await database.db.collection('ticketLedger').countDocuments()).toBe(committed ? 1 : 0);
    const wallet = await database.db.collection<StringIdDocument>('ticketWallets').findOne({ _id: 'host' });
    expect(wallet?.balance ?? 0).toBe(committed ? 1 : 0);
    const hand = await database.db.collection<StringIdDocument>('hands').findOne({ _id: candidate.handId });
    expect(hand?.status).toBe(committed ? 'COMPLETED' : 'ABORTED');
  });

  it('keeps concurrent hands under the shared UTC daily cap', async () => {
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    candidate.engine.manualActionAccountIds = ['guest'];
    const now = candidate.completedAt;
    await database.db.collection<StringIdDocument>('ticketWallets').insertOne({ _id: 'guest', balance: 19, revision: 0, createdAt: now, updatedAt: now });
    await database.db.collection('dailyEarnings').insertOne({ accountId: 'guest', utcDate: candidate.completedDateUtc, earned: 19 });
    await database.db.collection('ticketLedger').insertOne({ accountId: 'guest', delta: 19,
      reason: 'HAND_REWARD', sourceId: 'prior-hand', occurredAt: now });
    const session = await database.db.collection<StringIdDocument>('gameSessions').findOne({ _id: candidate.sessionId });
    expect(session).not.toBeNull();
    const secondSessionId = randomUUID();
    const secondHandId = randomUUID();
    await database.db.collection<StringIdDocument>('gameSessions').insertOne({ ...session!, _id: secondSessionId,
      startCommandId: randomUUID(), firstHandId: secondHandId });
    await database.db.collection<StringIdDocument>('hands').insertOne({ _id: secondHandId, sessionId: secondSessionId,
      roomId: candidate.roomId, handNumber: 1, status: 'PENDING', revision: 0, createdAt: now });
    const second = { ...candidate, sessionId: secondSessionId, handId: secondHandId };
    const results = await Promise.all([settlement.commit(candidate), settlement.commit(second)]);
    const guestAwards = results.map((result) => result.rewardReceipts?.find((receipt) => receipt.accountId === 'guest'));
    expect(guestAwards.map((receipt) => (receipt?.grantedParticipation ?? 0) + (receipt?.grantedBonus ?? 0)).sort()).toEqual([0, 1]);
    expect(await database.db.collection<StringIdDocument>('ticketWallets').findOne({ _id: 'guest' })).toMatchObject({ balance: 20, revision: 2 });
    expect((await database.db.collection('dailyEarnings').findOne({ accountId: 'guest' }))?.earned).toBe(20);
    const ledger = await database.db.collection<{ accountId: string; delta: number }>('ticketLedger').find({ accountId: 'guest' }).toArray();
    expect(ledger.reduce((sum, entry) => sum + entry.delta, 0)).toBe(20);
    expect(await database.db.collection('rewardReceipts').countDocuments({ accountId: 'guest' })).toBe(2);
  });

  it('serializes reward and pull changes on the wallet without restoring earning allowance', async () => {
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    candidate.rewardPolicyVersion = 1;
    candidate.dealtInAccountIds = ['host', 'guest'];
    candidate.engine.manualActionAccountIds = ['guest'];
    const now = candidate.completedAt;
    await database.db.collection<StringIdDocument>('ticketWallets').insertOne({ _id: 'guest', balance: 19, revision: 0, createdAt: now, updatedAt: now });
    await database.db.collection('dailyEarnings').insertOne({ accountId: 'guest', utcDate: candidate.completedDateUtc, earned: 19 });
    await database.db.collection('ticketLedger').insertOne({ accountId: 'guest', delta: 19, reason: 'HAND_REWARD', sourceId: 'prior-hand', occurredAt: now });
    const gacha = new GachaRepository(database.db, new TransactionRunner(database.client), new TicketsRepository(database.db));
    const [hand, pull] = await Promise.all([settlement.commit(candidate), gacha.pull('guest', { requestId: randomUUID(), count: 1, bannerVersion: CELESTIAL_BANNER.version })]);
    expect(hand.rewardReceipts?.find((receipt) => receipt.accountId === 'guest')?.grantedParticipation).toBe(1);
    expect(pull.cost).toBe(5);
    expect(await database.db.collection<StringIdDocument>('ticketWallets').findOne({ _id: 'guest' })).toMatchObject({ balance: 15, revision: 2 });
    expect((await database.db.collection('dailyEarnings').findOne({ accountId: 'guest' }))?.earned).toBe(20);
    const ledger = await database.db.collection<{ accountId: string; delta: number }>('ticketLedger').find({ accountId: 'guest' }).toArray();
    expect(ledger.reduce((sum, row) => sum + row.delta, 0)).toBe(15);
  });
});
