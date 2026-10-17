import { randomUUID } from 'node:crypto';
import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import type { GameClock } from '../src/infrastructure/gameClock';
import type { IdentityService } from '../src/modules/identity/identity.service';
import { RoomRepository } from '../src/modules/rooms/room.repository';
import { RoomService, type RoomContext } from '../src/modules/rooms/room.service';
import { RoomRegistry } from '../src/modules/rooms/roomRegistry';
import { RoomCommandCache } from '../src/modules/rooms/roomCommandCache';
import { GameCommandCache } from '../src/modules/rooms/gameCommandCache';
import { SessionRepository } from '../src/modules/rooms/session.repository';
import { SessionService } from '../src/modules/rooms/session.service';
import { GameService } from '../src/modules/rooms/game.service';
import { SettlementService } from '../src/modules/settlement/settlement.service';
import { SettlementRepository } from '../src/modules/settlement/settlement.repository';
import { TicketsRepository } from '../src/modules/tickets/tickets.repository';
import * as botStrategy from '../src/modules/rooms/bots/botStrategy';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

class Clock implements GameClock {
  public time = Date.now();
  public jobs: { at: number; callback: () => void; cancelled: boolean }[] = [];
  public now() { return this.time; }
  public schedule(at: number, callback: () => void) {
    const job = { at, callback, cancelled: false }; this.jobs.push(job);
    return () => { job.cancelled = true; };
  }
}

describe('practice bot lifecycle', () => {
  let database: TestDatabase, authority: AuthorityLease, registry: RoomRegistry, rooms: RoomService, game: GameService, clock: Clock;
  let roomId: string, bootId: string;
  let settlement: SettlementService;
  const context = (connectionId = 'human-tab'): RoomContext => ({ connectionId,
    identity: { accountId: 'human', displayName: 'Human', sessionId: 'auth', expiresAt: new Date(Date.now() + 600000) } });
  const gameContext = (connectionId = 'human-tab') => ({ ...context(connectionId), headers: new Headers() });
  const meta = () => ({ commandId: randomUUID(), authorityBootId: bootId, issuedAt: new Date(clock.time).toISOString(), controlEpoch: 1, roomId });
  const runtime = () => registry.controller(roomId).session!;
  const act = async (action: { type: 'call' | 'check' | 'fold' }) => game.execute(gameContext(), {
    type: 'game:action', ...meta(), sessionId: runtime().sessionId, handId: runtime().handId,
    expectedGameVersion: runtime().gameVersion, action,
  });
  const fire = async (job: Clock['jobs'][number], at = job.at) => {
    clock.time = at; job.cancelled = true; job.callback(); await registry.enqueue(roomId, async () => undefined);
  };
  beforeEach(async () => {
    database = await createTestDatabase(); await applyMigrations(database.db);
    authority = new AuthorityLease(database.db, 'bot-test');
    const token = (await authority.acquire())!; authority.markReady(token); bootId = token.bootId;
    registry = new RoomRegistry(); clock = new Clock();
    const repository = new RoomRepository(database.db, new TransactionRunner(database.client), authority);
    rooms = new RoomService(repository, registry, new RoomCommandCache(), authority);
    const sessions = new SessionService(new SessionRepository(database.db, new TransactionRunner(database.client), authority), registry, authority);
    settlement = new SettlementService(new SettlementRepository(database.db, new TransactionRunner(database.client), authority, new TicketsRepository(database.db)));
    game = new GameService(repository, sessions, registry, authority, { resolve: async () => context().identity } as unknown as IdentityService,
      clock, { shuffle: () => Array.from({ length: 52 }, (_, i) => i) }, new GameCommandCache(), settlement);
    const created = await rooms.execute(context(), { type: 'room:create', title: 'Practice', ...meta() });
    roomId = created.data!.room!.roomId;
    await rooms.execute(context(), { type: 'room:addBot', ...meta(), seat: 1 });
    expect((await game.execute(gameContext(), { type: 'session:start', ...meta() })).error).toBeNull();
  });
  afterEach(async () => { jest.restoreAllMocks(); game?.dispose(); rooms?.dispose(); await database?.dispose(); });

  it('acts once after 1–3 seconds through the same engine without manual bot qualification', async () => {
    expect((await act({ type: 'call' })).error).toBeNull();
    const version = runtime().gameVersion;
    const botJob = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at <= clock.time + 3000)!;
    expect(botJob).toBeDefined();
    expect(botJob.at - clock.time).toBeGreaterThanOrEqual(1000);
    await fire(botJob, botJob.at - 1); expect(runtime().gameVersion).toBe(version);
    await fire(botJob); expect(runtime().gameVersion).toBe(version + 1);
    await fire(botJob); expect(runtime().gameVersion).toBe(version + 1);
    expect(runtime().hand!.seats.find((seat) => seat.accountId.startsWith('bot:'))!.manualAction).toBe(false);
  });

  it('pauses a bot countdown and rejects its old callback after reconnect', async () => {
    await act({ type: 'call' });
    const version = runtime().gameVersion;
    const oldJob = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at <= clock.time + 3000)!;
    expect(oldJob).toBeDefined();
    clock.time += 500;
    const remaining = oldJob.at - clock.time;
    await rooms.disconnect('human-tab');
    expect(runtime().presencePaused).toBe(true);
    clock.time += 10000;
    oldJob.callback(); await registry.enqueue(roomId, async () => undefined);
    expect(runtime().gameVersion).toBe(version);
    await rooms.execute(context(), { type: 'room:sync', roomId });
    expect(runtime().presencePaused).toBe(false);
    const resumed = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at < clock.time + 30000)!;
    expect(resumed.at - clock.time).toBe(remaining);
    oldJob.callback(); await registry.enqueue(roomId, async () => undefined);
    expect(runtime().gameVersion).toBe(version);
    await fire(resumed); expect(runtime().gameVersion).toBe(version + 1);
  });

  it('counts an observer socket as presence and freezes human deadlines when the final socket leaves', async () => {
    await rooms.execute(context('observer'), { type: 'room:sync', roomId });
    await rooms.disconnect('human-tab');
    expect(runtime().presencePaused).toBe(false);
    const version = runtime().gameVersion;
    const safety = [...clock.jobs].reverse().find((job) => !job.cancelled)!;
    await rooms.disconnect('observer');
    expect(runtime().presencePaused).toBe(true);
    await fire(safety); expect(runtime().gameVersion).toBe(version);
  });

  it('preserves the full committed result display during absence and earns no tickets', async () => {
    await act({ type: 'fold' });
    const result = runtime().committedHandResult!;
    expect(result.mode).toBe('practice');
    const oldJob = [...clock.jobs].reverse().find((job) => !job.cancelled)!;
    clock.time += 2000;
    await rooms.disconnect('human-tab');
    clock.time += 60000;
    oldJob.callback(); await registry.enqueue(roomId, async () => undefined);
    expect(runtime().handNumber).toBe(1);
    await rooms.execute(context(), { type: 'room:sync', roomId });
    expect(runtime().nextTransitionAt! - clock.time).toBe(3000);
    expect(await database.db.collection('ticketWallets').countDocuments()).toBe(0);
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(0);
  });

  it('cancels bot work on room removal without recreating a runtime', async () => {
    await act({ type: 'call' });
    const job = [...clock.jobs].reverse().find((entry) => !entry.cancelled && entry.at <= clock.time + 3000)!;
    expect(job).toBeDefined();
    registry.remove(roomId);
    await fire(job);
    expect(clock.jobs.filter((entry) => !entry.cancelled)).toHaveLength(0);
  });

  it('continues frozen settlement retry while absent and resumes a full result interval', async () => {
    jest.spyOn(settlement, 'commit').mockRejectedValueOnce(new Error('temporary isolated database failure'));
    await act({ type: 'fold' });
    expect(runtime().paused).toBe(true);
    const retry = [...clock.jobs].reverse().find((job) => !job.cancelled)!;
    await rooms.disconnect('human-tab');
    expect(runtime().presencePaused).toBe(true);
    await fire(retry);
    expect(runtime().committedHandResult?.mode).toBe('practice');
    expect(runtime().paused).toBe(false);
    expect(runtime().presencePaused).toBe(true);
    expect(runtime().handNumber).toBe(1);
    await rooms.execute(context(), { type: 'room:sync', roomId });
    expect(runtime().nextTransitionAt! - clock.time).toBe(5000);
  });

  it('ends at the committed boundary when the last human is busted and retains bot seats', async () => {
    await act({ type: 'fold' });
    runtime().stacks = [0, 2000];
    const view = (await game.execute(gameContext(), { type: 'game:sync', roomId })).data!.game!;
    expect(view.nextTransition).toBe('session-end');
    const resultTimer = [...clock.jobs].reverse().find((job) => !job.cancelled)!;
    await fire(resultTimer);
    expect(runtime().sessionResult?.reason).toBe('NO_FUNDED_HUMANS');
    expect(runtime().handNumber).toBe(1);
    expect((await rooms.execute(context(), { type: 'room:sync', roomId })).data?.room).toMatchObject({ phase: 'waiting', bots: [expect.objectContaining({ displayName: 'Bot 1' })] });
  });

  it('cleans up an absent practice session and cancels all pending timers', async () => {
    rooms.dispose();
    rooms = new RoomService(new RoomRepository(database.db, new TransactionRunner(database.client), authority), registry, new RoomCommandCache(), authority, { emptyRetentionMs: 25 });
    await act({ type: 'call' });
    const sessionId = runtime().sessionId;
    await rooms.disconnect('human-tab');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await registry.enqueue(roomId, async () => undefined);
    expect(registry.peek(roomId)).toBeUndefined();
    expect(await database.db.collection('gameSessions').findOne({ roomId })).toMatchObject({ _id: sessionId, status: 'ABORTED' });
    expect(await database.db.collection('rooms').findOne({ title: 'Practice' })).toMatchObject({ status: 'CLOSED' });
    expect(clock.jobs.filter((job) => !job.cancelled)).toHaveLength(0);
  });

  it('restores turn timers after a transient next-hand persistence failure', async () => {
    await act({ type: 'fold' });
    jest.spyOn(SessionService.prototype, 'nextHandInQueue').mockRejectedValueOnce(new Error('temporary next hand failure'));
    await fire([...clock.jobs].reverse().find((job) => !job.cancelled)!);
    expect(runtime().paused).toBe(true);
    await fire([...clock.jobs].reverse().find((job) => !job.cancelled)!);
    expect(runtime().handNumber).toBe(2);
    expect(runtime().paused).toBe(false);
    expect(runtime().deadline).not.toBeNull();
  });

  it('retries failed bot and safety reads without losing the frozen turn', async () => {
    await act({ type: 'call' });
    const version = runtime().gameVersion;
    const bot = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at <= clock.time + 3000)!;
    const safety = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at === runtime().deadline)!;
    jest.spyOn(RoomRepository.prototype, 'load').mockRejectedValueOnce(new Error('temporary read outage')).mockRejectedValueOnce(new Error('temporary read outage'));
    await fire(bot);
    await fire(safety);
    expect(runtime().gameVersion).toBe(version);
    const retry = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at > clock.time);
    expect(retry).toBeDefined();
    await fire(retry!);
    expect(runtime().gameVersion).toBe(version + 1);
  });

  it('resumes a failed next-hand transition after disconnect without losing its retry', async () => {
    await act({ type: 'fold' });
    jest.spyOn(SessionService.prototype, 'nextHandInQueue').mockRejectedValueOnce(new Error('temporary transition outage'));
    await fire([...clock.jobs].reverse().find((job) => !job.cancelled)!);
    await rooms.disconnect('human-tab');
    const pending = [...clock.jobs].reverse().find((job) => !job.cancelled);
    if (pending) await fire(pending);
    await rooms.execute(context(), { type: 'room:sync', roomId });
    const restored = [...clock.jobs].reverse().find((job) => !job.cancelled && job.at >= clock.time);
    expect(restored).toBeDefined();
    await fire(restored!);
    expect(runtime().handNumber).toBe(2);
    expect(runtime().deadline).not.toBeNull();
  });

  it.each([1, 2, 3, 4, 5])('completes real practice hands with one human and %i bots', async (count) => {
    runtime().ending = true; await act({ type: 'fold' });
    await fire([...clock.jobs].reverse().find((job) => !job.cancelled)!);
    for (let seat = 2; seat <= count; seat += 1) expect((await rooms.execute(context(), { type: 'room:addBot', ...meta(), seat })).error).toBeNull();
    expect((await game.execute(gameContext(), { type: 'session:start', ...meta() })).error).toBeNull();
    expect(runtime().participants).toHaveLength(count + 1);
    for (let step = 0; step < 100 && runtime().committedHandResult?.handId !== runtime().handId; step += 1) {
      if (runtime().hand?.actorAccountId === 'human') await act({ type: 'fold' });
      else {
        const job = clock.jobs.filter((entry) => !entry.cancelled && entry.at >= clock.time).sort((a, b) => a.at - b.at)[0];
        expect(job).toBeDefined(); await fire(job!);
      }
    }
    expect(runtime().committedHandResult?.handId).toBe(runtime().handId);
    expect(runtime().committedHandResult?.mode).toBe('practice');
    expect(runtime().stacks.reduce((sum, stack) => sum + stack, 0)).toBe((count + 1) * 1000);
    expect(await database.db.collection('ticketWallets').countDocuments()).toBe(0);
    expect(await database.db.collection('activeParticipants').countDocuments()).toBe(1);
  });

  it.each(['throws', 'illegal'])('applies one legal fallback when strategy %s', async (failure) => {
    const strategy = jest.spyOn(botStrategy, 'chooseBotAction');
    if (failure === 'throws') strategy.mockImplementationOnce(() => { throw new Error('strategy failure'); });
    else strategy.mockReturnValueOnce({ type: 'raise', raiseTo: 0 });
    await act({ type: 'call' });
    const version = runtime().gameVersion;
    const job = [...clock.jobs].reverse().find((entry) => !entry.cancelled && entry.at <= clock.time + 3000)!;
    await fire(job);
    expect(runtime().gameVersion).toBe(version + 1);
    expect(runtime().hand!.seats.find((seat) => seat.accountId.startsWith('bot:'))!.manualAction).toBe(false);
  });

  it('waits for a completed settlement after retention expires, then closes without dealing again', async () => {
    rooms.dispose();
    rooms = new RoomService(new RoomRepository(database.db, new TransactionRunner(database.client), authority), registry, new RoomCommandCache(), authority, { emptyRetentionMs: 25 });
    jest.spyOn(settlement, 'commit').mockRejectedValueOnce(new Error('temporary settlement outage'));
    await act({ type: 'fold' });
    const handId = runtime().handId;
    const retry = [...clock.jobs].reverse().find((job) => !job.cancelled)!;
    await rooms.disconnect('human-tab');
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(registry.peek(roomId)?.session?.paused).toBe(true);
    expect(await database.db.collection('hands').countDocuments({ status: 'COMPLETED' })).toBe(0);
    await fire(retry);
    expect(runtime().handNumber).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await registry.enqueue(roomId, async () => undefined);
    expect(registry.peek(roomId)).toBeUndefined();
    expect(await database.db.collection('hands').findOne({ sessionId: { $exists: true } })).toMatchObject({ _id: handId, status: 'COMPLETED' });
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
    expect(await database.db.collection('ticketWallets').countDocuments()).toBe(0);
  });

  it('rejects bot callbacks from a lost authority or after shutdown', async () => {
    await act({ type: 'call' });
    const version = runtime().gameVersion;
    const job = [...clock.jobs].reverse().find((entry) => !entry.cancelled && entry.at <= clock.time + 3000)!;
    authority.markNotReady();
    await fire(job);
    expect(runtime().gameVersion).toBe(version);
    game.dispose(); job.callback(); await registry.enqueue(roomId, async () => undefined);
    expect(runtime().gameVersion).toBe(version);
    expect(clock.jobs.filter((entry) => !entry.cancelled)).toHaveLength(0);
  });

  it('rechecks the lease after asynchronous room reads before applying a bot action', async () => {
    await act({ type: 'call' });
    const version = runtime().gameVersion;
    const job = [...clock.jobs].reverse().find((entry) => !entry.cancelled && entry.at <= clock.time + 3000)!;
    const load = RoomRepository.prototype.load;
    jest.spyOn(RoomRepository.prototype, 'load').mockImplementationOnce(async function (this: RoomRepository, id: string) {
      const room = await load.call(this, id); authority.markNotReady(); return room;
    });
    await fire(job);
    expect(runtime().gameVersion).toBe(version);
  });
});
