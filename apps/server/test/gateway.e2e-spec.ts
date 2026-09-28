import { createHash, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type {
  ClientToServerEvents,
  Result,
  RoomCommand,
  RoomReply,
  ServerToClientEvents,
} from '@poker/contracts' with { 'resolution-mode': 'import' };
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { RoomService } from '../src/modules/rooms/room.service';
import { GameGateway } from '../src/realtime/game.gateway';
import { RoomPublisher } from '../src/realtime/roomPublisher';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

const mongoUri = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
const proxySecret = 'test-proxy-secret';
const publicOrigin = 'https://play.example';
const registrationCode = 'private-playtest-code';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('room gateway', () => {
  let application: INestApplication;
  let database: TestDatabase;
  let restoreEnvironment: () => void;

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    restoreEnvironment = setEnvironment(database.db.databaseName);
    application = await createApplication();
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    if (application) await application.close();
    if (restoreEnvironment) restoreEnvironment();
    if (database) await database.dispose();
  }, 15_000);

  it('acknowledges a validated room command and malformed payload exactly once', async () => {
    const account = await signUp('host@example.com', 'Host');
    const socket = connectSocket(account.cookie);
    try {
      const ready = await connectAndWaitForReady(socket);
      const created = await emitWithAck(socket, 'room:create', {
        type: 'room:create',
        title: 'Gateway room',
        commandId: randomUUID(),
        authorityBootId: ready.authorityBootId,
        issuedAt: new Date().toISOString(),
      });
      expect(created.error).toBeNull();
      expect(created.data?.room?.title).toBe('Gateway room');

      let ackCount = 0;
      const malformed = await new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('No malformed acknowledgement')), 1_000);
        socket.emit('room:create', 'invalid' as never, (reply) => {
          ackCount += 1;
          clearTimeout(timeout);
          resolve(reply);
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(ackCount).toBe(1);
      expect(malformed).toMatchObject({ error: { code: 'INVALID_REQUEST' } });

      emitWithoutAck(socket, 'room:sync', { type: 'room:sync', roomId: created.data?.room?.roomId ?? '' });
      await new Promise((resolve) => setTimeout(resolve, 25));
      const synchronized = await emitWithAck(socket, 'room:sync', {
        type: 'room:sync',
        roomId: created.data?.room?.roomId ?? '',
      });
      expect(synchronized.error).toBeNull();
    } finally {
      socket.close();
    }
  });

  it('waits for an acknowledged publication before application shutdown', async () => {
    const account = await signUp('shutdown@example.com', 'Shutdown Host');
    const socket = connectSocket(account.cookie);
    const publisher = application.get(RoomPublisher);
    const gateway = application.get(GameGateway);
    let releasePublication!: () => void;
    let publicationStarted!: () => void;
    const release = new Promise<void>((resolve) => { releasePublication = resolve; });
    const started = new Promise<void>((resolve) => { publicationStarted = resolve; });
    const publish = jest.spyOn(publisher, 'publish').mockImplementation(async () => {
      publicationStarted();
      await release;
    });

    try {
      const ready = await connectAndWaitForReady(socket);
      const acknowledgement = await emitWithAck(socket, 'room:create', mutation('room:create', ready.authorityBootId, {
        title: 'Shutdown room',
      }));
      expect(acknowledgement.error).toBeNull();
      await started;

      let shutdownFinished = false;
      const shutdown = gateway.beforeApplicationShutdown().then(() => { shutdownFinished = true; });
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(shutdownFinished).toBe(false);

      releasePublication();
      await shutdown;
      expect(shutdownFinished).toBe(true);
    } finally {
      releasePublication();
      publish.mockRestore();
      socket.close();
    }
  });

  it('drains an executing command and rejects commands that arrive during shutdown', async () => {
    const account = await signUp('command-shutdown@example.com', 'Command Shutdown Host');
    const socket = connectSocket(account.cookie);
    const rooms = application.get(RoomService);
    const gateway = application.get(GameGateway);
    const execute = rooms.execute.bind(rooms);
    let releaseExecution!: () => void;
    let executionStarted!: () => void;
    const release = new Promise<void>((resolve) => { releaseExecution = resolve; });
    const started = new Promise<void>((resolve) => { executionStarted = resolve; });
    let delayNextExecution = true;
    const executeSpy = jest.spyOn(rooms, 'execute').mockImplementation(async (...arguments_) => {
      if (delayNextExecution) {
        delayNextExecution = false;
        executionStarted();
        await release;
      }
      return execute(...arguments_);
    });

    try {
      const ready = await connectAndWaitForReady(socket);
      emitWithoutAck(socket, 'room:create', mutation('room:create', ready.authorityBootId, {
        title: 'Draining room',
      }));
      await started;

      let shutdownFinished = false;
      const shutdown = gateway.beforeApplicationShutdown().then(() => { shutdownFinished = true; });
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(shutdownFinished).toBe(false);

      const rejected = await emitWithAck(socket, 'room:create', mutation('room:create', ready.authorityBootId, {
        title: 'Too late',
      }));
      expect(rejected.error?.code).toBe('SERVICE_UNAVAILABLE');

      releaseExecution();
      await shutdown;
      expect(shutdownFinished).toBe(true);
    } finally {
      releaseExecution();
      executeSpy.mockRestore();
      socket.close();
    }
  });

  it('acknowledges an unauthenticated command exactly once before disconnecting', async () => {
    const socket = connectSocket('');
    try {
      await waitForConnect(socket);
      let ackCount = 0;
      const acknowledgement = await new Promise<Result<RoomReply>>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('No unauthenticated acknowledgement')), 1_000);
        const emitter = socket as unknown as {
          emit: (name: string, payload: RoomCommand, ack: (reply: Result<RoomReply>) => void) => void;
        };
        emitter.emit('room:create', {
          type: 'room:create',
          title: 'Denied',
          commandId: randomUUID(),
          authorityBootId: 'forged',
          issuedAt: new Date().toISOString(),
        }, (reply) => {
          ackCount += 1;
          clearTimeout(timeout);
          resolve(reply);
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(acknowledgement.error?.code).toBe('UNAUTHENTICATED');
      expect(ackCount).toBe(1);
    } finally {
      socket.close();
    }
  });

  it('reconnectReauthenticatesAndSyncs without leaking the invitation in snapshots', async () => {
    const hostAccount = await signUp('host@example.com', 'Host');
    const memberAccount = await signUp('member@example.com', 'Member');
    const host = connectSocket(hostAccount.cookie);
    const member = connectSocket(memberAccount.cookie);
    let reconnected: GameSocket | null = null;
    try {
      const hostReady = await connectAndWaitForReady(host);
      const created = await emitWithAck(host, 'room:create', mutation('room:create', hostReady.authorityBootId, {
        title: 'Reconnect room',
      }));
      if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
      const memberReady = await connectAndWaitForReady(member);
      const hostSnapshots: unknown[] = [];
      host.on('room:snapshot', (snapshot) => hostSnapshots.push(snapshot));
      const joined = await emitWithAck(member, 'room:join', mutation('room:join', memberReady.authorityBootId, {
        token: created.data.invitation.token,
      }));
      expect(joined.error).toBeNull();
      await waitFor(() => hostSnapshots.length > 0);
      expect(JSON.stringify(hostSnapshots)).not.toContain(created.data.invitation.token);

      member.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const moved = await emitWithAck(host, 'room:takeSeat', mutation('room:takeSeat', hostReady.authorityBootId, {
        roomId: created.data.room.roomId,
        seat: 2,
        controlEpoch: created.data.room.control.epoch,
      }));
      expect(moved.error).toBeNull();

      reconnected = connectSocket(memberAccount.cookie);
      await connectAndWaitForReady(reconnected);
      const synced = await emitWithAck(reconnected, 'room:sync', {
        type: 'room:sync',
        roomId: created.data.room.roomId,
      });
      const persisted = await database.db.collection<{ _id: string; revision: number }>('rooms')
        .findOne({ _id: created.data.room.roomId });
      expect(synced.data?.room?.revision).toBe(persisted?.revision);
    } finally {
      host.close();
      member.close();
      reconnected?.close();
    }
  });

  it('revokedRecipientReceivesNoSnapshot', async () => {
    const hostAccount = await signUp('host@example.com', 'Host');
    const memberAccount = await signUp('member@example.com', 'Member');
    const host = connectSocket(hostAccount.cookie);
    const member = connectSocket(memberAccount.cookie);
    try {
      const hostReady = await connectAndWaitForReady(host);
      const memberReady = await connectAndWaitForReady(member);
      const created = await emitWithAck(host, 'room:create', mutation('room:create', hostReady.authorityBootId, {
        title: 'Revocation room',
      }));
      if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
      await emitWithAck(member, 'room:join', mutation('room:join', memberReady.authorityBootId, {
        token: created.data.invitation.token,
      }));
      await new Promise((resolve) => setTimeout(resolve, 50));

      const snapshots: unknown[] = [];
      member.on('room:snapshot', (snapshot) => snapshots.push(snapshot));
      await database.db.collection('session').deleteOne({ token: memberAccount.token });
      await emitWithAck(host, 'room:takeSeat', mutation('room:takeSeat', hostReady.authorityBootId, {
        roomId: created.data.room.roomId,
        seat: 2,
        controlEpoch: created.data.room.control.epoch,
      }));
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(snapshots).toHaveLength(0);
    } finally {
      host.close();
      member.close();
    }
  });

  it('counts duplicate create attempts and safely rate-limits the sixth admission command', async () => {
    const account = await signUp('host@example.com', 'Host');
    const socket = connectSocket(account.cookie);
    try {
      const ready = await connectAndWaitForReady(socket);
      const command = mutation('room:create', ready.authorityBootId, { title: 'Limited room' });
      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect((await emitWithAck(socket, 'room:create', command)).error).toBeNull();
      }
      const limited = await emitWithAck(socket, 'room:create', command);
      expect(limited.error?.code).toBe('RATE_LIMITED');
      expect(await database.db.collection('rooms').countDocuments({ status: 'OPEN' })).toBe(1);
    } finally {
      socket.close();
    }
  });

  it('uses a separate ten-per-ten-second allowance for sync', async () => {
    const account = await signUp('host@example.com', 'Host');
    const socket = connectSocket(account.cookie);
    try {
      const ready = await connectAndWaitForReady(socket);
      const created = await emitWithAck(socket, 'room:create', mutation('room:create', ready.authorityBootId, {
        title: 'Sync room',
      }));
      if (created.error || !created.data.room) throw new Error('Expected room');
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const synchronized = await emitWithAck(socket, 'room:sync', {
          type: 'room:sync',
          roomId: created.data.room.roomId,
        });
        expect(synchronized.error).toBeNull();
      }
      const limited = await emitWithAck(socket, 'room:sync', {
        type: 'room:sync',
        roomId: created.data.room.roomId,
      });
      expect(limited.error?.code).toBe('RATE_LIMITED');
    } finally {
      socket.close();
    }
  });

  it('allows four sockets for one account and disconnects the fifth', async () => {
    const account = await signUp('host@example.com', 'Host');
    const sockets = Array.from({ length: 5 }, () => connectSocket(account.cookie));
    try {
      for (const socket of sockets.slice(0, 4)) await connectAndWaitForReady(socket);
      const fifthDisconnected = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Fifth socket stayed connected')), 1_000);
        sockets[4]?.once('disconnect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      sockets[4]?.connect();
      await fifthDisconnected;
      expect(sockets.slice(0, 4).every(({ connected }) => connected)).toBe(true);
    } finally {
      for (const socket of sockets) socket.close();
    }
  });

  it('disconnects a socket that exceeds the 16 KiB message limit', async () => {
    const account = await signUp('host@example.com', 'Host');
    const socket = connectSocket(account.cookie);
    try {
      const ready = await connectAndWaitForReady(socket);
      const disconnected = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Oversized socket stayed connected')), 1_000);
        socket.once('disconnect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      emitWithoutAck(socket, 'room:create', mutation('room:create', ready.authorityBootId, {
        title: 'x'.repeat(17 * 1_024),
      }));
      await disconnected;
    } finally {
      socket.close();
    }
  });

  it('returns SERVER_BUSY when more than 100 commands queue for one room', async () => {
    const accounts: Array<{ cookie: string; token: string }> = [];
    for (let index = 0; index < 6; index += 1) {
      accounts.push(await signUp(`queue-${index}@example.com`, `Queue ${index}`));
    }
    const sockets = accounts.map(({ cookie }) => connectSocket(cookie));
    try {
      const ready = await Promise.all(sockets.map((socket) => connectAndWaitForReady(socket)));
      const created = await emitWithAck(sockets[0]!, 'room:create', mutation(
        'room:create',
        ready[0]!.authorityBootId,
        { title: 'Busy room' },
      ));
      if (created.error || !created.data.room) throw new Error('Expected room');

      const attempts = sockets.flatMap((socket, socketIndex) => Array.from({ length: 20 }, () => (
        emitWithAck(socket, 'room:takeSeat', mutation('room:takeSeat', ready[socketIndex]!.authorityBootId, {
          roomId: created.data!.room!.roomId,
          seat: 5,
          controlEpoch: 999,
        }), 15_000)
      )));
      const replies = await Promise.all(attempts);

      expect(replies.some(({ error }) => error?.code === 'SERVER_BUSY')).toBe(true);
    } finally {
      for (const socket of sockets) socket.close();
    }
  }, 20_000);

  it('keeps explicit takeover after the old tab mutates and disconnects', async () => {
    const account = await signUp('host@example.com', 'Host');
    const oldTab = connectSocket(account.cookie);
    const newTab = connectSocket(account.cookie);
    try {
      const oldReady = await connectAndWaitForReady(oldTab);
      const newReady = await connectAndWaitForReady(newTab);
      const created = await emitWithAck(oldTab, 'room:create', mutation('room:create', oldReady.authorityBootId, {
        title: 'Takeover room',
      }));
      if (created.error || !created.data.room) throw new Error('Expected room');
      await emitWithAck(newTab, 'room:sync', { type: 'room:sync', roomId: created.data.room.roomId });
      const takeover = await emitWithAck(newTab, 'room:claimControl', mutation(
        'room:claimControl',
        newReady.authorityBootId,
        { roomId: created.data.room.roomId },
      ));
      if (takeover.error || !takeover.data.room) throw new Error('Expected takeover');

      const stale = await emitWithAck(oldTab, 'room:takeSeat', mutation('room:takeSeat', oldReady.authorityBootId, {
        roomId: created.data.room.roomId,
        seat: 1,
        controlEpoch: takeover.data.room.control.epoch,
      }));
      expect(stale.error?.code).toBe('NOT_CONTROLLER');
      oldTab.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const synchronized = await emitWithAck(newTab, 'room:sync', {
        type: 'room:sync',
        roomId: created.data.room.roomId,
      });
      expect(synchronized.data?.room?.control.isController).toBe(true);
    } finally {
      oldTab.close();
      newTab.close();
    }
  });

  async function signUp(email: string, name: string): Promise<{ cookie: string; token: string }> {
    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({ name, email, password: 'correct-horse-battery-staple', registrationCode });
    expect(response.status).toBe(200);
    return {
      cookie: response.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '',
      token: response.body.token as string,
    };
  }

  function connectSocket(cookie: string): GameSocket {
    const address = application.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Expected listening server');
    return io(`http://127.0.0.1:${address.port}`, {
      autoConnect: false,
      path: '/socket.io',
      transports: ['websocket'],
      extraHeaders: { cookie, origin: publicOrigin, 'x-poker-proxy-secret': proxySecret },
    });
  }
});

function connectAndWaitForReady(socket: GameSocket): Promise<{ authorityBootId: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('No connection:ready event')), 1_000);
    socket.once('connection:ready', (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
    socket.once('connect_error', reject);
    socket.connect();
  });
}

function waitForConnect(socket: GameSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
    socket.connect();
  });
}

function emitWithAck(
  socket: GameSocket,
  event: keyof ClientToServerEvents,
  command: RoomCommand,
  timeoutMs = 1_000,
): Promise<Result<RoomReply>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No acknowledgement for ${event}`)), timeoutMs);
    const emitter = socket as unknown as {
      emit: (name: string, payload: RoomCommand, ack: (reply: Result<RoomReply>) => void) => void;
    };
    emitter.emit(event, command, (reply) => {
      clearTimeout(timeout);
      resolve(reply);
    });
  });
}

function emitWithoutAck(socket: GameSocket, event: keyof ClientToServerEvents, command: RoomCommand): void {
  const emitter = socket as unknown as { emit: (name: string, payload: RoomCommand) => void };
  emitter.emit(event, command);
}

function mutation<Type extends Exclude<RoomCommand['type'], 'room:sync'>>(
  type: Type,
  authorityBootId: string,
  fields: Omit<Extract<RoomCommand, { type: Type }>, 'type' | 'commandId' | 'authorityBootId' | 'issuedAt'>,
): Extract<RoomCommand, { type: Type }> {
  return {
    type,
    commandId: randomUUID(),
    authorityBootId,
    issuedAt: new Date().toISOString(),
    ...fields,
  } as Extract<RoomCommand, { type: Type }>;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Condition was not observed');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function setEnvironment(databaseName: string): () => void {
  const values: Record<string, string> = {
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    PROXY_SECRET: proxySecret,
    PUBLIC_ORIGIN: publicOrigin,
    BETTER_AUTH_SECRET: 'test-better-auth-secret-with-32-characters',
    REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
  };
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
