import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { testAccountEmailInbox } from '../src/modules/identity/accountEmail.service';
import { TicketsService } from '../src/modules/tickets/tickets.service';
import { TicketsRepository } from '../src/modules/tickets/tickets.repository';
import { TransactionRunner } from '../src/database/transactionRunner';
import type { Db } from 'mongodb';
import { AccountPublisher } from '../src/realtime/accountPublisher';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { randomUUID } from 'node:crypto';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('authenticated ticket wallet', () => {
  let app: INestApplication;
  let database: TestDatabase;
  let restore: () => void;
  const origin = 'https://play.example';
  const proxySecret = 'test-proxy-secret';
  const registrationCode = 'private-playtest-code';

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    const values: Record<string, string> = {
      MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
      MONGODB_DATABASE: database.db.databaseName, PROXY_SECRET: proxySecret, PUBLIC_ORIGIN: origin,
      BETTER_AUTH_SECRET: 'test-better-auth-secret-with-32-characters',
      REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
      ACCOUNT_EMAIL_TRANSPORT: 'memory', ACCOUNT_RECOVERY_ENFORCED: 'true',
    };
    const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
    Object.assign(process.env, values);
    restore = () => {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    };
    testAccountEmailInbox.length = 0;
    app = await createApplication();
    await app.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    if (app) await app.close();
    if (restore) restore();
    if (database) await database.dispose();
  });

  async function createAccount(email: string): Promise<{ id: string; cookie: string; token: string }> {
    const signup = await request(app.getHttpServer()).post('/api/auth/sign-up/email')
      .set('origin', origin).set('x-poker-proxy-secret', proxySecret)
      .send({ name: email, email, password: 'correct-horse-battery-staple', registrationCode });
    expect(signup.status).toBe(200);
    const link = new URL(testAccountEmailInbox.at(-1)!.url);
    await request(app.getHttpServer()).get(link.pathname + link.search).set('x-poker-proxy-secret', proxySecret);
    const signin = await request(app.getHttpServer()).post('/api/auth/sign-in/email')
      .set('origin', origin).set('x-poker-proxy-secret', proxySecret)
      .send({ email, password: 'correct-horse-battery-staple' });
    expect(signin.status).toBe(200);
    return { id: signup.body.user.id as string, cookie: signin.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '', token: signin.body.token as string };
  }

  it('starts verified accounts at zero and reads only the session owner', async () => {
    const alice = await createAccount('alice@example.com');
    const bob = await createAccount('bob@example.com');
    const read = (cookie: string) => request(app.getHttpServer()).get('/api/wallet')
      .set('cookie', cookie).set('x-poker-proxy-secret', proxySecret);
    expect((await read(alice.cookie)).body.data.balance).toBe(0);
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: alice.id }, { $set: { balance: 7 } });
    expect((await read(alice.cookie)).body.data.balance).toBe(7);
    const bobView = await read(bob.cookie);
    expect(bobView.status).toBe(200);
    expect(bobView.body.data).toMatchObject({ balance: 0, revision: 0, earnedToday: 0, dailyCap: 20, remainingToday: 20 });
    expect((await read('')).status).toBe(401);
  });

  it('protects pull receipts and collection mutations with session, origin and strict intent checks', async () => {
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    const alice = await createAccount('alice@example.com');
    const bob = await createAccount('bob@example.com');
    await app.get(TicketsService).getWallet(alice.id, new Date());
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: alice.id }, { $set: { balance: 5 } });
    const input = { requestId: randomUUID(), bannerVersion: CELESTIAL_BANNER.version, count: 1 };
    const post = (body: object, suppliedOrigin = origin) => request(app.getHttpServer()).post('/api/pulls')
      .set('origin', suppliedOrigin).set('cookie', alice.cookie).set('x-poker-proxy-secret', proxySecret).send(body);
    expect((await post(input, 'https://evil.example')).status).toBe(403);
    expect((await post({ ...input, accountId: bob.id })).status).toBe(400);
    const committed = await post(input);
    expect(committed.status).toBe(201);
    expect((await post(input)).body.data).toEqual(committed.body.data);
    const read = (path: string, cookie = alice.cookie) => request(app.getHttpServer()).get(path).set('cookie', cookie).set('x-poker-proxy-secret', proxySecret);
    expect((await read(`/api/pulls/${input.requestId}`, bob.cookie)).status).toBe(404);
    expect((await read('/api/banner', '')).status).toBe(401);
    const owned = (await read('/api/collection')).body.data;
    expect(owned.items).toHaveLength(1);
    expect((await read('/api/collection', bob.cookie)).body.data.items).toHaveLength(0);
    const item = committed.body.data.results[0].item;
    const selected = await request(app.getHttpServer()).put(`/api/equipment/${item.slot}`).set('origin', origin)
      .set('cookie', alice.cookie).set('x-poker-proxy-secret', proxySecret).send({ itemId: item.id, expectedRevision: 0 });
    expect(selected.status).toBe(200);
    expect(selected.body.data[item.slot].itemId).toBe(item.id);
    for (let i = 0; i < 28; i += 1) await post(input);
    expect((await post(input)).status).toBe(429);
    expect((await read(`/api/pulls/${input.requestId}`)).body.data).toEqual(committed.body.data);
  });

  it('resets the UTC allowance at midnight while preserving the balance', async () => {
    const alice = await createAccount('alice@example.com');
    const service = app.get(TicketsService);
    await service.getWallet(alice.id, new Date('2026-09-30T23:59:59Z'));
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: alice.id }, { $set: { balance: 20 } });
    await database.db.collection('dailyEarnings').insertOne({ accountId: alice.id, utcDate: '2026-09-30', earned: 20 });
    expect(await service.getWallet(alice.id, new Date('2026-09-30T23:59:59Z'))).toMatchObject({ balance: 20, remainingToday: 0 });
    expect(await service.getWallet(alice.id, new Date('2026-10-01T00:00:00Z'))).toMatchObject({ balance: 20, earnedToday: 0, remainingToday: 20 });
  });

  it('reads balance and allowance from the same snapshot across a concurrent commit', async () => {
    const alice = await createAccount('alice@example.com');
    const tickets = app.get(TicketsRepository);
    await tickets.ensureWallet(alice.id);
    let interleaved = false;
    const commit = async () => new TransactionRunner(database.client).run(async (session) => {
      await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: alice.id }, { $inc: { balance: 1, revision: 1 } }, { session });
      await database.db.collection('dailyEarnings').insertOne({ accountId: alice.id, utcDate: '2026-09-30', earned: 1 }, { session });
    });
    const interleavedDb = new Proxy(database.db, {
      get(target, property) {
        if (property !== 'collection') {
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        }
        return (name: string) => new Proxy(target.collection(name), {
          get(collection, method) {
            const value = Reflect.get(collection, method);
            if (name === 'ticketWallets' && method === 'findOne') return async (...args: unknown[]) => {
              const wallet: unknown = await Reflect.apply(value, collection, args);
              if (!interleaved) { interleaved = true; await commit(); }
              return wallet;
            };
            return typeof value === 'function' ? value.bind(collection) : value;
          },
        });
      },
    }) as Db;
    const [wallet, earned] = await new TicketsRepository(interleavedDb).readWallet(alice.id, '2026-09-30');
    expect(wallet.balance).toBe(earned);
  });

  it('publishes only to the account and disconnects revoked sessions before an event', async () => {
    const alice = await createAccount('alice@example.com');
    const bob = await createAccount('bob@example.com');
    const connect = async (cookie: string): Promise<Socket> => {
      const address = app.getHttpServer().address() as { port: number };
      const socket = io(`http://127.0.0.1:${address.port}`, {
        transports: ['websocket'], autoConnect: false, reconnection: false,
        extraHeaders: { origin, cookie, 'x-poker-proxy-secret': proxySecret },
      });
      await new Promise<void>((resolve, reject) => {
        socket.once('connection:ready', () => resolve());
        socket.once('connect_error', reject);
        socket.connect();
      });
      return socket;
    };
    const aliceSocket = await connect(alice.cookie);
    const bobSocket = await connect(bob.cookie);
    try {
      const aliceEvents: unknown[] = [];
      const bobEvents: unknown[] = [];
      aliceSocket.on('account:changed', (event) => aliceEvents.push(event));
      bobSocket.on('account:changed', (event) => bobEvents.push(event));
      const event = new Promise((resolve) => aliceSocket.once('account:changed', resolve));
      await app.get(AccountPublisher).changed(alice.id, 1);
      expect(await event).toEqual({ revision: 1 });
      // A subsequent acknowledged publication gives both clients time to receive any leaked hint.
      await app.get(AccountPublisher).changed(bob.id, 2);
      await new Promise<void>((resolve) => setTimeout(resolve, 30));
      expect(bobEvents).toEqual([{ revision: 2 }]);
      expect(aliceEvents).toEqual([{ revision: 1 }]);
      expect((await database.db.collection('session').deleteOne({ token: alice.token })).deletedCount).toBe(1);
      const disconnected = new Promise((resolve) => aliceSocket.once('disconnect', resolve));
      await app.get(AccountPublisher).changed(alice.id, 3);
      await disconnected;
      expect(aliceEvents).toEqual([{ revision: 1 }]);
    } finally {
      aliceSocket.close();
      bobSocket.close();
    }
  });
});
