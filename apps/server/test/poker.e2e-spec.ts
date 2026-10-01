import { randomUUID } from 'node:crypto';

import type { GameCommand } from '@poker/contracts' with { 'resolution-mode': 'import' };

import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import type { GameClock } from '../src/infrastructure/gameClock';
import type { DeckFactory } from '../src/infrastructure/deckFactory';
import type { IdentityService, VerifiedAccountIdentity } from '../src/modules/identity/identity.service';
import { GameCommandCache } from '../src/modules/rooms/gameCommandCache';
import { GameService } from '../src/modules/rooms/game.service';
import { RoomCommandCache } from '../src/modules/rooms/roomCommandCache';
import { RoomRepository } from '../src/modules/rooms/room.repository';
import { RoomRegistry } from '../src/modules/rooms/roomRegistry';
import { RoomService, type RoomContext } from '../src/modules/rooms/room.service';
import { SessionRepository } from '../src/modules/rooms/session.repository';
import { SessionService } from '../src/modules/rooms/session.service';
import { SettlementRepository } from '../src/modules/settlement/settlement.repository';
import { SettlementService } from '../src/modules/settlement/settlement.service';
import { TicketsRepository } from '../src/modules/tickets/tickets.repository';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { CollectionRepository } from '../src/modules/collection/collection.repository';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

class FakeClock implements GameClock {
  public current = Date.now();
  public callbacks: { at: number; callback: () => void; cancelled: boolean }[] = [];
  public now(): number { return this.current; }
  public schedule(at: number, callback: () => void): () => void {
    const timer = { at, callback, cancelled: false };
    this.callbacks.push(timer);
    return () => { timer.cancelled = true; };
  }
}

describe('authoritative poker actions', () => {
  let database: TestDatabase;
  let authority: AuthorityLease;
  let registry: RoomRegistry;
  let rooms: RoomService;
  let game: GameService;
  let settlement: SettlementService;
  let clock: FakeClock;
  let roomId: string;
  let bootId: string;
  let sessionId: string;
  let handId: string;
  let startCommand: Extract<GameCommand, { type: 'session:start' }>;

  const identity = (accountId: string): VerifiedAccountIdentity => ({
    accountId, displayName: accountId, sessionId: `${accountId}-session`, expiresAt: new Date(Date.now() + 60_000),
  });
  const roomContext = (accountId: string, connectionId = `${accountId}-tab`): RoomContext => ({ identity: identity(accountId), connectionId });
  const gameContext = (accountId: string, connectionId = `${accountId}-tab`) => ({
    ...roomContext(accountId, connectionId), headers: new Headers({ 'x-test-account': accountId }),
  });
  const metadata = () => ({ commandId: randomUUID(), authorityBootId: bootId, issuedAt: new Date(clock.current).toISOString(), roomId });
  const action = (accountId: string, expectedGameVersion = 0): Extract<GameCommand, { type: 'game:action' }> => ({
    type: 'game:action', ...metadata(), controlEpoch: 1, sessionId, handId, expectedGameVersion,
    action: { type: 'call' },
  });

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    authority = new AuthorityLease(database.db, 'poker-test-boot');
    const token = await authority.acquire();
    if (!token) throw new Error('Expected authority');
    authority.markReady(token);
    bootId = token.bootId;
    registry = new RoomRegistry();
    const repository = new RoomRepository(database.db, new TransactionRunner(database.client), authority);
    rooms = new RoomService(repository, registry, new RoomCommandCache(), authority);
    const sessions = new SessionService(
      new SessionRepository(database.db, new TransactionRunner(database.client), authority), registry, authority,
    );
    clock = new FakeClock();
    const deckFactory: DeckFactory = { shuffle: () => Array.from({ length: 52 }, (_, index) => index) };
    const identityService = { resolve: async (headers: Headers) => {
      const accountId = headers.get('x-test-account');
      return accountId ? identity(accountId) : null;
    } } as IdentityService;
    settlement = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client), authority,
      new TicketsRepository(database.db)));
    game = new GameService(repository, sessions, registry, authority, identityService, clock, deckFactory,
      new GameCommandCache(), settlement);
    const created = await rooms.execute(roomContext('host'), {
      type: 'room:create', title: 'Poker', commandId: randomUUID(), authorityBootId: bootId,
      issuedAt: new Date(clock.current).toISOString(),
    });
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    roomId = created.data.room.roomId;
    const joined = await rooms.execute(roomContext('guest'), {
      type: 'room:join', token: created.data.invitation.token, commandId: randomUUID(), authorityBootId: bootId,
      issuedAt: new Date(clock.current).toISOString(),
    });
    if (joined.error) throw new Error('Expected guest');
    startCommand = { type: 'session:start', ...metadata(), controlEpoch: 1 };
    const started = await game.execute(gameContext('host'), startCommand);
    if (started.error || !started.data.game?.handId) throw new Error(`Expected game: ${JSON.stringify(started.error)}`);
    sessionId = started.data.game.sessionId;
    handId = started.data.game.handId;
  });

  afterEach(async () => {
    game.dispose();
    rooms.dispose();
    await database.dispose();
  });

  it('accepts a manual action one millisecond before the deadline', async () => {
    clock.current = clock.callbacks[0]!.at - 1;
    const reply = await game.execute(gameContext('host'), action('host'));
    expect(reply.error).toBeNull();
    expect(reply.data?.outcome?.acceptedGameVersion).toBe(1);
    expect(reply.data?.game?.gameVersion).toBe(1);
  });

  it('freezes equipment for all recipients until the durable next-hand boundary', async () => {
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    const item = CELESTIAL_BANNER.items.find((candidate) => candidate.slot === 'avatar')!;
    await database.db.collection('ownedCosmetics').insertOne({ accountId: 'host', itemId: item.id,
      bannerVersion: CELESTIAL_BANNER.version, requestId: randomUUID(), acquiredAt: new Date() });
    const collection = new CollectionRepository(database.db, new TransactionRunner(database.client));
    await collection.equip('host', 'avatar', item.id, 0);
    const before = await game.execute(gameContext('guest'), { type: 'game:sync', roomId });
    expect(before.data?.game?.participants.find((player) => player.accountId === 'host')?.equipment?.avatar).toBeNull();
    const version = before.data?.game?.gameVersion;
    await game.execute(gameContext('host'), { ...action('host'), action: { type: 'fold' } });
    const resultTimer = clock.callbacks.at(-1)!;
    clock.current = resultTimer.at;
    resultTimer.callback();
    await registry.enqueue(roomId, async () => undefined);
    const hostView = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    const guestView = await game.execute(gameContext('guest'), { type: 'game:sync', roomId });
    const selected = hostView.data?.game?.participants.find((player) => player.accountId === 'host')?.equipment;
    expect(selected?.avatar).toEqual(item);
    expect(guestView.data?.game?.participants.find((player) => player.accountId === 'host')?.equipment).toEqual(selected);
    const hand = await database.db.collection('hands').findOne({ sessionId, handNumber: 2 });
    expect(hand?.equipmentByAccount.host).toEqual(selected);
    expect(version).toBe(0);
    await collection.equip('host', 'avatar', null, 1);
    const unchanged = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    expect(unchanged.data?.game?.participants.find((player) => player.accountId === 'host')?.equipment).toEqual(selected);
    expect(unchanged.data?.game?.gameVersion).toBe(hostView.data?.game?.gameVersion);
  });

  it('applies timeout first at the exact deadline even before the callback fires', async () => {
    const publications: string[] = [];
    game.subscribeUpdates((updatedRoomId) => { publications.push(updatedRoomId); });
    clock.current = clock.callbacks[0]!.at;
    const late = await game.execute(gameContext('host'), action('host'));
    expect(late.error?.code).toBe('STALE_STATE');
    expect(registry.controller(roomId).session?.hand?.version).toBe(1);
    expect(registry.controller(roomId).session?.hand?.street).toBe('complete');
    expect(publications).toEqual([roomId]);
  });

  it('ignores a stale timer after a manual transition', async () => {
    const oldTimer = clock.callbacks[0]!;
    await game.execute(gameContext('host'), action('host'));
    oldTimer.callback();
    await registry.enqueue(roomId, async () => undefined);
    expect(registry.controller(roomId).session?.hand?.version).toBe(1);
  });

  it('serializes simultaneous actions and deduplicates an identical retry', async () => {
    const command = action('host');
    const other = action('host');
    const [first, second] = await Promise.all([
      game.execute(gameContext('host'), command), game.execute(gameContext('host'), other),
    ]);
    expect([first.error?.code, second.error?.code].filter((code) => code === undefined)).toHaveLength(1);
    expect([first.error?.code, second.error?.code]).toContain('STALE_STATE');
    const retry = await game.execute(gameContext('host'), command);
    expect(retry.data?.outcome).toEqual(first.data?.outcome);
    expect(registry.controller(roomId).session?.hand?.version).toBe(1);
  });

  it('replays a committed action outcome while the hand is settling', async () => {
    const command = { ...action('host'), action: { type: 'fold' as const } };
    const first = await game.execute(gameContext('host'), command);
    expect(first.error).toBeNull();
    expect(first.data?.game?.handPhase).toBe('result');
    expect(first.data?.game?.handResult?.rewardReceipts).toEqual([
      expect.objectContaining({ accountId: 'host', grantedParticipation: 1, grantedBonus: 0 }),
    ]);
    const guestView = await game.execute(gameContext('guest'), { type: 'game:sync', roomId });
    expect(guestView.data?.game?.handResult?.rewardReceipts).toEqual([
      expect.objectContaining({ accountId: 'guest', reason: 'NO_MANUAL_ACTION', grantedParticipation: 0 }),
    ]);
    const retry = await game.execute(gameContext('host'), command);
    expect(retry.error).toBeNull();
    expect(retry.data?.outcome).toEqual(first.data?.outcome);
  });

  it('rejects an old tab after takeover wins the queue', async () => {
    const observed = await rooms.execute(roomContext('host', 'new-tab'), { type: 'room:sync', roomId });
    expect(observed.error).toBeNull();
    let release!: () => void;
    let entered!: () => void;
    const running = new Promise<void>((resolve) => { entered = resolve; });
    const blocker = registry.enqueue(roomId, () => new Promise<void>((resolve) => {
      release = resolve;
      entered();
    }));
    await running;
    const originalEnqueue = registry.enqueue.bind(registry);
    let claimQueued!: () => void;
    const queued = new Promise<void>((resolve) => { claimQueued = resolve; });
    registry.enqueue = <T>(id: string, work: () => Promise<T>): Promise<T> => {
      claimQueued();
      return originalEnqueue(id, work);
    };
    const takeover = rooms.execute(roomContext('host', 'new-tab'), {
      type: 'room:claimControl', ...metadata(),
    });
    await queued;
    const pending = game.execute(gameContext('host'), action('host'));
    release();
    await blocker;
    expect((await takeover).error).toBeNull();
    expect((await pending).error?.code).toBe('NOT_CONTROLLER');
    expect(registry.controller(roomId).session?.hand?.version).toBe(0);
  });

  it('rejects authority loss before a queued action executes', async () => {
    let release!: () => void;
    let entered!: () => void;
    const running = new Promise<void>((resolve) => { entered = resolve; });
    const blocker = registry.enqueue(roomId, () => new Promise<void>((resolve) => {
      release = resolve;
      entered();
    }));
    await running;
    const pending = game.execute(gameContext('host'), action('host'));
    authority.markNotReady();
    release();
    await blocker;
    expect((await pending).error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(registry.controller(roomId).session?.hand?.version).toBe(0);
  });

  it('advances snapshot revision for presence without changing betting version', async () => {
    const before = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    await rooms.execute(roomContext('guest', 'guest-observer-tab'), { type: 'room:sync', roomId });
    const after = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    expect(after.data?.game?.snapshotRevision).toBeGreaterThan(before.data?.game?.snapshotRevision ?? -1);
    expect(after.data?.game?.gameVersion).toBe(before.data?.game?.gameVersion);
  });

  it('invalidates the turn timer when authority is lost', async () => {
    const timer = clock.callbacks[0]!;
    authority.markNotReady();
    clock.current = timer.at;
    timer.callback();
    await registry.enqueue(roomId, async () => undefined);
    expect(timer.cancelled).toBe(true);
    expect(registry.controller(roomId).session?.hand?.version).toBe(0);
  });

  it('resolves an all-in call without another actor or lost chips', async () => {
    const shove = await game.execute(gameContext('host'), {
      ...action('host'), action: { type: 'raise', raiseTo: 1000 },
    });
    expect(shove.error).toBeNull();
    const called = await game.execute(gameContext('guest'), action('guest', 1));
    expect(called.error).toBeNull();
    expect(called.data?.game?.handPhase).toBe('result');
    expect(called.data?.game?.board).toHaveLength(5);
    expect(registry.controller(roomId).session?.settlement?.finalStacks.reduce((sum, value) => sum + value, 0))
      .toBe(2000);
  });

  it('replays the accepted start version after later betting without redealing', async () => {
    await game.execute(gameContext('host'), action('host'));
    const retry = await game.execute(gameContext('host'), startCommand);
    expect(retry.error).toBeNull();
    expect(retry.data?.outcome?.acceptedGameVersion).toBe(0);
    expect(retry.data?.game?.gameVersion).toBe(1);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
  });

  it('replays an old start outcome without replacing a newer live session', async () => {
    await game.execute(gameContext('host'), {
      type: 'session:end', ...metadata(), controlEpoch: 1, sessionId,
    });
    await game.execute(gameContext('host'), { ...action('host'), action: { type: 'fold' } });
    const resultTimer = clock.callbacks.at(-1)!;
    clock.current = resultTimer.at;
    resultTimer.callback();
    await registry.enqueue(roomId, async () => undefined);

    const nextStart = await game.execute(gameContext('host'), {
      type: 'session:start', ...metadata(), controlEpoch: 1,
    });
    expect(nextStart.error).toBeNull();
    const currentSessionId = nextStart.data?.game?.sessionId;
    const currentHandId = nextStart.data?.game?.handId;
    expect(currentSessionId).not.toBe(sessionId);

    const retry = await game.execute(gameContext('host'), startCommand);
    expect(retry.error).toBeNull();
    expect(retry.data?.outcome?.sessionId).toBe(sessionId);
    expect(retry.data?.game?.sessionId).toBe(currentSessionId);
    expect(registry.controller(roomId).session?.sessionId).toBe(currentSessionId);
    expect(registry.controller(roomId).session?.handId).toBe(currentHandId);
    expect(await database.db.collection('hands').countDocuments()).toBe(2);
  });

  it('commits a hand before carrying its stacks into a persisted next hand', async () => {
    const finished = await game.execute(gameContext('host'), { ...action('host'), action: { type: 'fold' } });
    expect(finished.error).toBeNull();
    expect(finished.data?.game?.handResult?.winners).toEqual(['guest']);
    expect((await database.db.collection<{ _id: string; status: string }>('hands')
      .findOne({ _id: handId }))?.status).toBe('COMPLETED');
    const resultTimer = clock.callbacks.at(-1)!;
    expect(resultTimer.at).toBe(clock.current + 5_000);
    clock.current = resultTimer.at;
    resultTimer.callback();
    await registry.enqueue(roomId, async () => undefined);
    const next = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    expect(next.data?.game?.handId).not.toBe(handId);
    expect(next.data?.game?.buttonSeat).toBe(1);
    expect((await database.db.collection<{ _id: string; stacks: number[] }>('gameSessions')
      .findOne({ _id: sessionId }))?.stacks).toEqual([990, 1010]);
    expect(await database.db.collection('hands').countDocuments()).toBe(2);
    resultTimer.callback();
    await registry.enqueue(roomId, async () => undefined);
    expect(await database.db.collection('hands').countDocuments()).toBe(2);
  });

  it('honors host end during the result interval and releases participation', async () => {
    await game.execute(gameContext('host'), { ...action('host'), action: { type: 'fold' } });
    const ended = await game.execute(gameContext('host'), {
      type: 'session:end', ...metadata(), controlEpoch: 1, sessionId,
    });
    expect(ended.error).toBeNull();
    const resultTimer = clock.callbacks.at(-1)!;
    clock.current = resultTimer.at;
    resultTimer.callback();
    await registry.enqueue(roomId, async () => undefined);
    const view = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    expect(view.data?.game?.sessionResult?.reason).toBe('HOST_ENDED');
    expect((await rooms.execute(roomContext('host'), { type: 'room:sync', roomId })).data?.room?.phase)
      .toBe('waiting');
    expect(await database.db.collection('activeParticipants').countDocuments()).toBe(0);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
  });

  it('pauses on settlement failure and retries the frozen result before dealing', async () => {
    const actualCommit = settlement.commit.bind(settlement);
    let attempts = 0;
    jest.spyOn(settlement, 'commit').mockImplementation(async (candidate) => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary database outage');
      return actualCommit(candidate);
    });
    const finished = await game.execute(gameContext('host'), { ...action('host'), action: { type: 'fold' } });
    expect(finished.data?.game?.handPhase).toBe('paused');
    expect(finished.data?.game?.handResult).toBeNull();
    expect((await database.db.collection<{ _id: string; status: string }>('hands').findOne({ _id: handId }))?.status)
      .toBe('PENDING');
    const retry = clock.callbacks.at(-1)!;
    clock.current = retry.at;
    retry.callback();
    await registry.enqueue(roomId, async () => undefined);
    const recovered = await game.execute(gameContext('host'), { type: 'game:sync', roomId });
    expect(recovered.data?.game?.handPhase).toBe('result');
    expect(recovered.data?.game?.handResult?.winners).toEqual(['guest']);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
    expect(attempts).toBe(2);
  });
});
