import { createHash, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { GameReply, Result } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

const mongoUri = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
const origin = 'https://play.example';
const proxySecret = 'test-proxy-secret';
const registrationCode = 'private-playtest-code';

describe('private poker gateway', () => {
  let db: TestDatabase;
  let app: INestApplication;
  let restore: () => void;

  beforeEach(async () => {
    db = await createTestDatabase();
    await applyMigrations(db.db);
    const values: Record<string, string> = {
      MONGODB_URI: mongoUri, MONGODB_DATABASE: db.db.databaseName, PROXY_SECRET: proxySecret,
      PUBLIC_ORIGIN: origin, BETTER_AUTH_SECRET: 'test-better-auth-secret-with-32-characters',
      REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
    };
    const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
    Object.assign(process.env, values);
    restore = () => { for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    } };
    app = await createApplication();
    await app.listen(0, '127.0.0.1');
  });

  afterEach(async () => { await app.close(); restore(); await db.dispose(); });

  async function signUp(email: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/api/auth/sign-up/email')
      .set('origin', origin).set('x-poker-proxy-secret', proxySecret)
      .send({ name: email, email, password: 'correct-horse-battery-staple', registrationCode });
    expect(response.status).toBe(200);
    return response.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
  }

  function socket(cookie: string): Socket {
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('No server');
    return io(`http://127.0.0.1:${address.port}`, { autoConnect: false, path: '/socket.io',
      transports: ['websocket'], extraHeaders: { cookie, origin, 'x-poker-proxy-secret': proxySecret } });
  }

  function ready(client: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      client.once('connection:ready', (value: { authorityBootId: string }) => resolve(value.authorityBootId));
      client.once('connect_error', reject);
      client.connect();
    });
  }

  function emit(client: Socket, event: string, command: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`No ${event} acknowledgement`)), 2_000);
      client.emit(event, command, (reply: unknown) => { clearTimeout(timeout); resolve(reply); });
    });
  }

  it('sends each account only its own hole cards and rejects outsider and observer actions', async () => {
    const hostCookie = await signUp('poker-host@example.com');
    const host = socket(hostCookie);
    const guest = socket(await signUp('poker-guest@example.com'));
    const outsider = socket(await signUp('poker-outsider@example.com'));
    const observer = socket(hostCookie);
    try {
      const bootId = await ready(host);
      await Promise.all([ready(guest), ready(outsider), ready(observer)]);
      const meta = () => ({ commandId: randomUUID(), authorityBootId: bootId, issuedAt: new Date().toISOString() });
      const created = await emit(host, 'room:create', { type: 'room:create', title: 'Private poker', ...meta() });
      const roomId = created.data.room.roomId as string;
      await emit(guest, 'room:join', { type: 'room:join', token: created.data.invitation.token, ...meta() });
      await emit(observer, 'room:sync', { type: 'room:sync', roomId });
      const hostSnapshots: unknown[] = [];
      const guestSnapshots: unknown[] = [];
      host.on('game:snapshot', (view) => hostSnapshots.push(view));
      guest.on('game:snapshot', (view) => guestSnapshots.push(view));
      const started: Result<GameReply> = await emit(host, 'session:start',
        { type: 'session:start', roomId, controlEpoch: 1, ...meta() });
      expect(started.error).toBeNull();
      const hostView = (await emit(host, 'game:sync', { type: 'game:sync', roomId })).data.game;
      const guestView = (await emit(guest, 'game:sync', { type: 'game:sync', roomId })).data.game;
      expect(hostView.holeCards).toHaveLength(2);
      expect(guestView.holeCards).toHaveLength(2);
      expect(hostView.holeCards).not.toEqual(guestView.holeCards);
      for (let attempt = 0; attempt < 50 && (!hostSnapshots.length || !guestSnapshots.length); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect((hostSnapshots.at(-1) as { holeCards: number[] }).holeCards).toEqual(hostView.holeCards);
      expect((guestSnapshots.at(-1) as { holeCards: number[] }).holeCards).toEqual(guestView.holeCards);
      expect(hostView.revealedCards).toEqual([]);
      expect(guestView.revealedCards).toEqual([]);
      expect(hostView.participants.every((player: object) => !('holeCards' in player))).toBe(true);
      expect((await emit(outsider, 'game:sync', { type: 'game:sync', roomId })).error?.code).toBe('FORBIDDEN');
      const observerView = (await emit(observer, 'game:sync', { type: 'game:sync', roomId })).data.game;
      expect(observerView.control.isController).toBe(false);
      expect((await emit(observer, 'game:action', { type: 'game:action', roomId,
        sessionId: hostView.sessionId, handId: hostView.handId,
        expectedGameVersion: 0, controlEpoch: 1, action: { type: 'call' }, ...meta() })).error?.code)
        .toBe('NOT_CONTROLLER');
      expect((await emit(host, 'game:action', 'malformed')).error?.code).toBe('INVALID_REQUEST');
    } finally {
      host.close(); guest.close(); outsider.close(); observer.close();
    }
  }, 20_000);
});
