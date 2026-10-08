import { createHash, randomUUID } from 'node:crypto';

import type { GameCommand } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { INestApplication } from '@nestjs/common';
import type { GameReply, Result, RoomReply } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { applyAction, startHand } from '@poker/poker-engine';
import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { createApplication } from '../src/main';
import { CollectionRepository } from '../src/modules/collection/collection.repository';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { GachaRepository } from '../src/modules/gacha/gacha.repository';
import { RoomCommandCache } from '../src/modules/rooms/roomCommandCache';
import { RoomRepository } from '../src/modules/rooms/room.repository';
import { RoomRegistry } from '../src/modules/rooms/roomRegistry';
import { RoomService, type RoomContext } from '../src/modules/rooms/room.service';
import { SessionRepository } from '../src/modules/rooms/session.repository';
import { SessionService } from '../src/modules/rooms/session.service';
import { SettlementRepository } from '../src/modules/settlement/settlement.repository';
import { SettlementService } from '../src/modules/settlement/settlement.service';
import { TicketsRepository } from '../src/modules/tickets/tickets.repository';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('release admission and maintenance on a real replica set', () => {
  let database: TestDatabase;
  let authority: AuthorityLease;
  let runner: TransactionRunner;
  let registry: RoomRegistry;
  let roomRepository: RoomRepository;
  let rooms: RoomService;
  let sessions: SessionService;
  let gacha: GachaRepository;
  let bootId: string;
  let previous: Record<string, string | undefined>;

  const context = (accountId: string): RoomContext => ({
    identity: { accountId, displayName: accountId, sessionId: `${accountId}-session`, expiresAt: new Date(Date.now() + 60_000) },
    connectionId: `${accountId}-tab`,
  });
  const metadata = () => ({ commandId: randomUUID(), authorityBootId: bootId, issuedAt: new Date().toISOString() });
  const startCommand = (roomId: string): Extract<GameCommand, { type: 'session:start' }> => ({
    type: 'session:start', roomId, controlEpoch: 1, ...metadata(),
  });
  const purchase = () => ({ requestId: randomUUID(), bannerVersion: CELESTIAL_BANNER.version, count: 1 as const });
  const sessionService = () => new SessionService(new SessionRepository(database.db, runner, authority), registry, authority);
  const purchaseRepository = () => new GachaRepository(database.db, runner, new TicketsRepository(database.db));
  const preparedRoom = async (host: string, guest: string) => {
    const created = await rooms.execute(context(host), { type: 'room:create', title: 'Release test', ...metadata() });
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    expect((await rooms.execute(context(guest), { type: 'room:join', token: created.data.invitation.token, ...metadata() })).error).toBeNull();
    return created.data.room.roomId;
  };
  const start = (service: SessionService, host: string, command: Extract<GameCommand, { type: 'session:start' }>) =>
    registry.enqueue(command.roomId, () => service.startInQueue(context(host), command));

  beforeEach(async () => {
    previous = { ALLOW_NEW_SESSIONS: process.env.ALLOW_NEW_SESSIONS, ECONOMY_WRITES_ENABLED: process.env.ECONOMY_WRITES_ENABLED };
    process.env.ALLOW_NEW_SESSIONS = 'true'; process.env.ECONOMY_WRITES_ENABLED = 'true';
    database = await createTestDatabase();
    await applyMigrations(database.db);
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    runner = new TransactionRunner(database.client);
    authority = new AuthorityLease(database.db, 'release-test-boot');
    const token = await authority.acquire();
    if (!token) throw new Error('Expected authority');
    authority.markReady(token); bootId = token.bootId;
    registry = new RoomRegistry();
    roomRepository = new RoomRepository(database.db, runner, authority);
    rooms = new RoomService(roomRepository, registry, new RoomCommandCache(), authority);
    sessions = sessionService(); gacha = purchaseRepository();
    await new TicketsRepository(database.db).ensureWallet('alice');
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: 'alice' }, { $set: { balance: 50 } });
    await database.db.collection('ticketLedger').insertOne({ accountId: 'alice', delta: 50, reason: 'HAND_REWARD', sourceId: 'test-seed', occurredAt: new Date() });
  });
  afterEach(async () => {
    jest.restoreAllMocks(); rooms?.dispose();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (database) await database.dispose();
  });

  it('admits exactly one of concurrent starts in different rooms and cannot bypass capacity on retry', async () => {
    const first = await preparedRoom('host-a', 'guest-a');
    const second = await preparedRoom('host-b', 'guest-b');
    const commands = [startCommand(first), startCommand(second)];
    const hosts = ['host-a', 'host-b'];
    const results = await Promise.allSettled(commands.map((command, i) => start(sessions, hosts[i]!, command)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const loser = results.findIndex((result) => result.status === 'rejected');
    const winner = 1 - loser;
    expect(results[loser]).toMatchObject({ status: 'rejected', reason: { code: 'SESSION_LIMIT_REACHED' } });
    for (const command of [commands[loser]!, startCommand(commands[loser]!.roomId)]) {
      await expect(start(sessions, hosts[loser]!, command)).rejects.toMatchObject({ code: 'SESSION_LIMIT_REACHED' });
    }
    const won = results[winner]!;
    if (won.status !== 'fulfilled') throw new Error('Expected winner');
    expect((await start(sessions, hosts[winner]!, commands[winner]!)).sessionId).toBe(won.value.sessionId);
    expect(await database.db.collection('gameSessions').countDocuments({ status: 'ACTIVE' })).toBe(1);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
    expect(await database.db.collection('activeParticipants').countDocuments()).toBe(2);
    expect((await roomRepository.load(commands[loser]!.roomId))?.phase).toBe('waiting');
  });

  it('frees global capacity only after durable session completion', async () => {
    const first = await preparedRoom('host-a', 'guest-a');
    const second = await preparedRoom('host-b', 'guest-b');
    const current = await start(sessions, 'host-a', startCommand(first));
    await expect(start(sessions, 'host-b', startCommand(second))).rejects.toMatchObject({ code: 'SESSION_LIMIT_REACHED' });
    // Isolate admission from engine settlement: completion still checks the persisted hand boundary.
    await database.db.collection<{ _id: string }>('hands').updateOne({ _id: current.handId }, { $set: { status: 'COMPLETED' } });
    await sessions.completeInQueue(current, 'HOST_ENDED', new Date());
    expect((await start(sessions, 'host-b', startCommand(second))).roomId).toBe(second);
    expect(await database.db.collection('gameSessions').countDocuments({ status: 'ACTIVE' })).toBe(1);
  });

  it('frees capacity after empty-room abort without awarding the unfinished hand', async () => {
    const first = await preparedRoom('host-a', 'guest-a');
    const current = await start(sessions, 'host-a', startCommand(first));
    await roomRepository.closeEmpty(first, authority.currentToken()!, new Date());
    const second = await preparedRoom('host-b', 'guest-b');
    expect((await start(sessions, 'host-b', startCommand(second))).roomId).toBe(second);
    expect(await database.db.collection<{ _id: string }>('hands').findOne({ _id: current.handId })).toMatchObject({ status: 'ABORTED' });
    expect(await database.db.collection('rewardReceipts').countDocuments()).toBe(0);
  });

  it('blocks new starts in maintenance but resolves committed start identity and allows ending', async () => {
    const first = await preparedRoom('host-a', 'guest-a');
    const command = startCommand(first);
    const current = await start(sessions, 'host-a', command);
    const second = await preparedRoom('host-b', 'guest-b');
    process.env.ALLOW_NEW_SESSIONS = 'false';
    const closed = sessionService();
    expect((await start(closed, 'host-a', command)).sessionId).toBe(current.sessionId);
    await expect(start(closed, 'host-a', { ...command, controlEpoch: 2 })).rejects.toMatchObject({ code: 'COMMAND_CONFLICT' });
    await expect(start(closed, 'host-b', startCommand(second))).rejects.toMatchObject({ code: 'MAINTENANCE' });
    await closed.requestEndInQueue(context('host-a'), { type: 'session:end', roomId: first, sessionId: current.sessionId, controlEpoch: 1, ...metadata() });
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(1);
    expect(await database.db.collection<{ _id: string }>('gameSessions').findOne({ _id: current.sessionId })).toMatchObject({ endingRequested: true });
  });

  it('rolls back failed admission and permits another room to start', async () => {
    const first = await preparedRoom('host-a', 'guest-a');
    const second = await preparedRoom('host-b', 'guest-b');
    const fence = authority.fence.bind(authority);
    jest.spyOn(authority, 'fence').mockImplementationOnce(async (session, token) => {
      await fence(session, token); throw new Error('Interrupted admission');
    });
    await expect(start(sessions, 'host-a', startCommand(first))).rejects.toThrow('Interrupted admission');
    expect((await start(sessions, 'host-b', startCommand(second))).roomId).toBe(second);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
  });

  it('resolves a lost start commit acknowledgement without admitting another session during maintenance', async () => {
    const roomId = await preparedRoom('host-a', 'guest-a');
    const command = startCommand(roomId); const run = runner.run.bind(runner);
    jest.spyOn(runner, 'run').mockImplementationOnce(async (work) => {
      await run(work); process.env.ALLOW_NEW_SESSIONS = 'false'; throw new Error('Lost start acknowledgement');
    });
    const current = await start(sessions, 'host-a', command);
    expect((await start(sessionService(), 'host-a', command)).sessionId).toBe(current.sessionId);
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(1);
    expect(await database.db.collection('hands').countDocuments()).toBe(1);
  });

  it('settles an admitted hand and its rewards once and advances the existing session with maintenance enabled', async () => {
    const roomId = await preparedRoom('host-a', 'guest-a');
    const current = await start(sessions, 'host-a', startCommand(roomId));
    const dealt = startHand({ seats: current.participants.map((participant) => ({ ...participant, startingStack: 1_000 })),
      buttonSeat: 0, smallBlind: 10, bigBlind: 20, deck: Array.from({ length: 52 }, (_, i) => i) });
    const engine = applyAction(dealt.state, 'host-a', { type: 'fold' }, 'manual').settlement!;
    process.env.ALLOW_NEW_SESSIONS = 'false'; process.env.ECONOMY_WRITES_ENABLED = 'false';
    const settlements = new SettlementService(new SettlementRepository(database.db, runner, authority, new TicketsRepository(database.db)));
    const now = new Date();
    const candidate = { roomId, sessionId: current.sessionId, handId: current.handId, handNumber: 1,
      authority: authority.currentToken()!, expectedRevision: 0, rulesVersion: 1, completedAt: now,
      completedDateUtc: now.toISOString().slice(0, 10), rewardPolicyVersion: 1,
      dealtInAccountIds: ['host-a', 'guest-a'], participants: current.participants, engine };
    const result = await settlements.commit(candidate);
    expect(await settlements.commit(candidate)).toEqual(result);
    expect(await database.db.collection<{ _id: string; balance: number }>('ticketWallets').findOne({ _id: 'host-a' })).toMatchObject({ balance: 1 });
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'HAND_REWARD', sourceId: current.handId })).toBe(1);
    const next = randomUUID();
    await sessionService().nextHandInQueue(current, next, 1, new Date());
    expect(current.handId).toBe(next); expect(current.handNumber).toBe(2);
    expect(await database.db.collection('gameSessions').countDocuments({ status: 'ACTIVE' })).toBe(1);
  });

  it('blocks concurrent new purchases without changing balances, revisions, inventory or pity', async () => {
    process.env.ECONOMY_WRITES_ENABLED = 'false';
    const closed = purchaseRepository();
    const before = await database.db.collection<{ _id: string }>('ticketWallets').findOne({ _id: 'alice' });
    const results = await Promise.allSettled([closed.pull('alice', purchase()), closed.pull('alice', purchase())]);
    expect(results.every((result) => result.status === 'rejected' && result.reason.code === 'MAINTENANCE')).toBe(true);
    expect(await database.db.collection<{ _id: string }>('ticketWallets').findOne({ _id: 'alice' })).toEqual(before);
    for (const name of ['pullReceipts', 'ownedCosmetics', 'bannerProgress']) expect(await database.db.collection(name).countDocuments()).toBe(0);
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'PULL' })).toBe(0);
    await expect(closed.pull('new-account', purchase())).rejects.toMatchObject({ code: 'MAINTENANCE' });
    expect(await database.db.collection('ticketWallets').countDocuments()).toBe(1);
  });

  it('replays committed purchases in maintenance even with an unavailable catalogue, without another debit', async () => {
    const input = purchase(); const receipt = await gacha.pull('alice', input);
    process.env.ECONOMY_WRITES_ENABLED = 'false'; const closed = purchaseRepository();
    await database.db.collection<{ _id: string }>('bannerVersions').deleteOne({ _id: CELESTIAL_BANNER.version });
    expect(await closed.pull('alice', input)).toEqual(receipt);
    expect(await closed.findReceipt('alice', input.requestId)).toEqual(receipt);
    expect(await closed.findReceipt('bob', input.requestId)).toBeNull();
    await expect(closed.pull('alice', { ...input, count: 10 })).rejects.toMatchObject({ code: 'COMMAND_CONFLICT' });
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'PULL' })).toBe(1);
    expect(await database.db.collection<{ _id: string; balance: number }>('ticketWallets').findOne({ _id: 'alice' })).toMatchObject({ balance: 45 });
  });

  it('finishes admitted purchases while newly configured callers are closed, including lost commit acknowledgement', async () => {
    const input = purchase(); const run = runner.run.bind(runner);
    jest.spyOn(runner, 'run').mockImplementationOnce(async (work) => {
      const receipt = await run(async (session) => {
        const result = await work(session);
        process.env.ECONOMY_WRITES_ENABLED = 'false';
        await expect(purchaseRepository().pull('bob', purchase())).rejects.toMatchObject({ code: 'MAINTENANCE' });
        return result;
      });
      expect(receipt).toBeDefined(); throw new Error('Lost commit acknowledgement');
    });
    const receipt = await gacha.pull('alice', input);
    expect(await purchaseRepository().pull('alice', input)).toEqual(receipt);
    expect(await database.db.collection('pullReceipts').countDocuments()).toBe(1);
    expect(await database.db.collection<{ _id: string; balance: number }>('ticketWallets').findOne({ _id: 'alice' })).toMatchObject({ balance: 45 });
  });

  it('blocks equipment writes in economy maintenance while preserving collection and equipment reads', async () => {
    const receipt = await gacha.pull('alice', purchase());
    process.env.ECONOMY_WRITES_ENABLED = 'false';
    const collection = new CollectionRepository(database.db, runner);
    const item = CELESTIAL_BANNER.items.find((entry) => entry.id === receipt.results[0]!.itemId)!;
    await expect(collection.equip('alice', item.slot, item.id, 0)).rejects.toMatchObject({ code: 'MAINTENANCE' });
    expect((await collection.collection('alice')).items).toHaveLength(1);
    expect((await collection.equipment('alice'))[item.slot]).toEqual({ itemId: null, revision: 0 });
    expect(await database.db.collection('equipment').countDocuments()).toBe(0);
  });
});

describe('release controls through authenticated HTTP and Socket.IO', () => {
  let database: TestDatabase;
  let app: INestApplication | undefined;
  let clients: Socket[];
  let previous: Record<string, string | undefined>;
  const origin = 'https://play.example';
  const proxySecret = 'test-proxy-secret';
  const registrationCode = 'release-test-code';

  beforeEach(async () => {
    database = await createTestDatabase(); await applyMigrations(database.db);
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    clients = []; app = undefined;
    const environment: Record<string, string> = {
      MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
      MONGODB_DATABASE: database.db.databaseName, PUBLIC_ORIGIN: origin, PROXY_SECRET: proxySecret,
      BETTER_AUTH_SECRET: 'test-better-auth-secret-with-32-characters',
      REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
      ALLOW_NEW_SESSIONS: 'true', ECONOMY_WRITES_ENABLED: 'true',
    };
    previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
    Object.assign(process.env, environment);
  });
  afterEach(async () => {
    for (const client of clients) client.close();
    await app?.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await database.dispose();
  });
  async function launch(open: boolean) {
    process.env.ALLOW_NEW_SESSIONS = String(open); process.env.ECONOMY_WRITES_ENABLED = String(open);
    app = await createApplication(); await app.listen(0, '127.0.0.1');
  }
  async function account(name: string) {
    const response = await request(app!.getHttpServer()).post('/api/auth/sign-up/email')
      .set('origin', origin).set('x-poker-proxy-secret', proxySecret)
      .send({ name, email: `${name}@example.com`, password: 'correct-horse-battery-staple', registrationCode });
    expect(response.status).toBe(200);
    const cookie = response.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const address = app!.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('No server');
    const client = io(`http://127.0.0.1:${address.port}`, { autoConnect: false, transports: ['websocket'],
      extraHeaders: { cookie, origin, 'x-poker-proxy-secret': proxySecret } });
    clients.push(client);
    const bootId = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No connection readiness')), 2_000);
      client.once('connection:ready', (value: { authorityBootId: string }) => { clearTimeout(timeout); resolve(value.authorityBootId); });
      client.once('connect_error', (error) => { clearTimeout(timeout); reject(error); }); client.connect();
    });
    return { client, cookie, accountId: response.body.user.id as string, bootId };
  }
  const emit = <T>(client: Socket, event: string, command: unknown): Promise<Result<T>> => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No ${event} acknowledgement`)), 2_000);
    client.emit(event, command, (reply: Result<T>) => { clearTimeout(timeout); resolve(reply); });
  });
  const meta = (bootId: string) => ({ authorityBootId: bootId, commandId: randomUUID(), issuedAt: new Date().toISOString() });
  async function preparedRoom(host: Awaited<ReturnType<typeof account>>, guest: Awaited<ReturnType<typeof account>>) {
    const created = await emit<RoomReply>(host.client, 'room:create', { type: 'room:create', title: 'Release test', ...meta(host.bootId) });
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    expect((await emit<RoomReply>(guest.client, 'room:join', { type: 'room:join', token: created.data.invitation.token, ...meta(host.bootId) })).error).toBeNull();
    return created.data.room.roomId;
  }

  it('rejects browser attempts to override maintenance and returns stable HTTP/socket errors', async () => {
    await launch(false);
    const host = await account('closed-host'); const guest = await account('closed-guest');
    const roomId = await preparedRoom(host, guest);
    const command = { type: 'session:start', roomId, controlEpoch: 1, ...meta(host.bootId) };
    expect((await emit<GameReply>(host.client, 'session:start', { ...command, ALLOW_NEW_SESSIONS: true })).error?.code).toBe('INVALID_REQUEST');
    expect((await emit<GameReply>(host.client, 'session:start', command)).error?.code).toBe('MAINTENANCE');
    const input = { requestId: randomUUID(), bannerVersion: CELESTIAL_BANNER.version, count: 1 };
    const response = await request(app!.getHttpServer()).post('/api/pulls')
      .set('cookie', host.cookie).set('origin', origin).set('x-poker-proxy-secret', proxySecret).send(input);
    expect(response.status).toBe(503); expect(response.body.error.code).toBe('MAINTENANCE');
    const forged = await request(app!.getHttpServer()).post('/api/pulls')
      .set('cookie', host.cookie).set('origin', origin).set('x-poker-proxy-secret', proxySecret)
      .send({ ...input, ECONOMY_WRITES_ENABLED: true });
    expect(forged.status).toBe(400);
    const equipped = await request(app!.getHttpServer()).put('/api/equipment/avatar')
      .set('cookie', host.cookie).set('origin', origin).set('x-poker-proxy-secret', proxySecret)
      .send({ itemId: null, expectedRevision: 0 });
    expect(equipped.status).toBe(503); expect(equipped.body.error.code).toBe('MAINTENANCE');
    for (const path of ['/api/banner', '/api/collection', '/api/equipment']) {
      expect((await request(app!.getHttpServer()).get(path).set('cookie', host.cookie).set('x-poker-proxy-secret', proxySecret)).status).toBe(200);
    }
    expect(await database.db.collection('gameSessions').countDocuments()).toBe(0);
    expect(await database.db.collection('pullReceipts').countDocuments()).toBe(0);
    expect(await database.db.collection('ticketWallets').countDocuments()).toBe(0);
  }, 20_000);

  it('enforces the global limit for concurrent real-client starts and idempotent retries', async () => {
    await launch(true);
    const hostA = await account('host-a'); const guestA = await account('guest-a');
    const hostB = await account('host-b'); const guestB = await account('guest-b');
    const hosts = [hostA, hostB];
    const rooms = [await preparedRoom(hostA, guestA), await preparedRoom(hostB, guestB)];
    const commands = rooms.map((roomId, i) => ({ type: 'session:start', roomId, controlEpoch: 1, ...meta(hosts[i]!.bootId) }));
    const replies = await Promise.all(hosts.map((host, i) => emit<GameReply>(host.client, 'session:start', commands[i])));
    expect(replies.filter((reply) => reply.error === null)).toHaveLength(1);
    const loser = replies.findIndex((reply) => reply.error !== null); const winner = 1 - loser;
    expect(replies[loser]?.error?.code).toBe('SESSION_LIMIT_REACHED');
    expect((await emit<GameReply>(hosts[loser]!.client, 'session:start', commands[loser])).error?.code).toBe('SESSION_LIMIT_REACHED');
    const retry = await emit<GameReply>(hosts[winner]!.client, 'session:start', commands[winner]);
    expect(retry.data?.outcome).toEqual(replies[winner]?.data?.outcome);
    expect(await database.db.collection('gameSessions').countDocuments({ status: 'ACTIVE' })).toBe(1);
  }, 20_000);

  it('reads and replays an account-owned receipt over HTTP in maintenance without another charge', async () => {
    await launch(false);
    const owner = await account('receipt-owner'); const other = await account('receipt-other');
    await new TicketsRepository(database.db).ensureWallet(owner.accountId);
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: owner.accountId }, { $set: { balance: 5 } });
    // Fixture writer represents a purchase admitted by the previous open process.
    process.env.ECONOMY_WRITES_ENABLED = 'true';
    const writer = new GachaRepository(database.db, new TransactionRunner(database.client), new TicketsRepository(database.db));
    process.env.ECONOMY_WRITES_ENABLED = 'false';
    const input = { requestId: randomUUID(), bannerVersion: CELESTIAL_BANNER.version, count: 1 as const };
    const receipt = await writer.pull(owner.accountId, input);
    const replay = await request(app!.getHttpServer()).post('/api/pulls').set('cookie', owner.cookie)
      .set('origin', origin).set('x-poker-proxy-secret', proxySecret).send(input);
    expect(replay.status).toBe(201); expect(replay.body.data).toEqual(receipt);
    const read = await request(app!.getHttpServer()).get(`/api/pulls/${input.requestId}`)
      .set('cookie', owner.cookie).set('x-poker-proxy-secret', proxySecret);
    expect(read.status).toBe(200); expect(read.body.data).toEqual(receipt);
    expect((await request(app!.getHttpServer()).get(`/api/pulls/${input.requestId}`)
      .set('cookie', other.cookie).set('x-poker-proxy-secret', proxySecret)).status).toBe(404);
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'PULL' })).toBe(1);
    expect(await database.db.collection<{ _id: string; balance: number }>('ticketWallets').findOne({ _id: owner.accountId })).toMatchObject({ balance: 0 });
  }, 20_000);
});
