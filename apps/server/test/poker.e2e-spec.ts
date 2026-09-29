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
    game = new GameService(repository, sessions, registry, authority, identityService, clock, deckFactory, new GameCommandCache());
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

  it('applies timeout first at the exact deadline even before the callback fires', async () => {
    clock.current = clock.callbacks[0]!.at;
    const late = await game.execute(gameContext('host'), action('host'));
    expect(late.error?.code).toBe('STALE_STATE');
    expect(registry.controller(roomId).session?.hand?.version).toBe(1);
    expect(registry.controller(roomId).session?.hand?.street).toBe('complete');
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
    expect(first.data?.game?.handPhase).toBe('settling');
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
    expect(called.data?.game?.handPhase).toBe('settling');
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
});
