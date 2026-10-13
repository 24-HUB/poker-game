import { createHash } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io } from 'socket.io-client';
import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { testAccountEmailInbox } from '../src/modules/identity/accountEmail.service';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';
import { MONGO_CLIENT } from '../src/database/database.tokens';
import type { MongoClient } from 'mongodb';

const origin = 'https://play.example'; const proxySecret = 'test-proxy-secret';
const password = 'correct-horse-battery-staple'; const registrationCode = 'private-playtest-code';
const email = 'friend@example.com';
describe('native account code recovery', () => {
  let app: INestApplication; let database: TestDatabase; let restore: () => void;
  beforeEach(async () => {
    database = await createTestDatabase(); await applyMigrations(database.db);
    const values = {
      MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
      MONGODB_DATABASE: database.db.databaseName, PROXY_SECRET: proxySecret, PUBLIC_ORIGIN: origin,
      BETTER_AUTH_SECRET: 'test-better-auth-secret-with-32-characters',
      REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
      ACCOUNT_EMAIL_TRANSPORT: 'memory', ACCOUNT_RECOVERY_ENFORCED: 'true',
    };
    const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]])); Object.assign(process.env, values);
    restore = () => { for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
    testAccountEmailInbox.length = 0; app = await createApplication(); await app.listen(0, '127.0.0.1');
  });
  afterEach(async () => { if (app) await app.close(); if (restore) restore(); if (database) await database.dispose(); });
  const post = (path: string, body: object) => request(app.getHttpServer()).post(path).set('origin', origin).set('x-poker-proxy-secret', proxySecret).send(body);
  const signup = () => post('/api/auth/sign-up/email', { name: 'Friend', email, password, registrationCode });
  const verify = (otp = [...testAccountEmailInbox].reverse().find((entry) => entry.kind === 'verification')!.code) => post('/api/auth/email-otp/verify-email', { email, otp });
  const requestReset = (address = email) => post('/api/auth/email-otp/request-password-reset', { email: address });
  const reset = (otp: string, newPassword = 'new-correct-password') => post('/api/auth/email-otp/reset-password', { email, otp, password: newPassword });
  const signin = (value = password) => post('/api/auth/sign-in/email', { email, password: value });
  const me = (cookie = '') => request(app.getHttpServer()).get('/api/me').set('cookie', cookie).set('x-poker-proxy-secret', proxySecret);

  it('issues one code and verifies without a session or identity change', async () => {
    const created = await signup(); expect(created.status).toBe(200); expect(created.body.token).toBeNull();
    expect(testAccountEmailInbox).toHaveLength(1); expect(/^\d{6}$/.test(testAccountEmailInbox[0]!.code)).toBe(true);
    expect((await signin()).body.code).toBe('EMAIL_NOT_VERIFIED'); expect(testAccountEmailInbox).toHaveLength(1);
    const confirmed = await verify(); expect(confirmed.status).toBe(200); expect(confirmed.body).toEqual({ status: true });
    expect(confirmed.headers['set-cookie']).toBeUndefined(); expect((await me()).status).toBe(401);
    const signed = await signin(); expect(signed.status).toBe(200); expect(signed.body.user.id).toBe(created.body.user.id);
    expect((await verify()).status).toBe(400);
  });
  it('does not issue or replace codes for the provider synthetic duplicate signup response', async () => {
    await signup(); const before = await database.db.collection('emailCodeChallenges').find().toArray();
    expect((await signup()).status).toBe(200); expect(testAccountEmailInbox).toHaveLength(1);
    await database.db.collection<{ _id: string; attempts: Date[] }>('emailCodeRateLimits').updateMany({ _id: { $regex: ':email-verification$' } }, { $set: { attempts: [new Date(Date.now() - 61_000)] } });
    expect((await signup()).status).toBe(200); expect(testAccountEmailInbox).toHaveLength(1);
    expect(await database.db.collection('emailCodeChallenges').find().toArray()).toEqual(before);
  });

  it.each([false, true])('reset verifies email and preserves wallet and identity (previously verified: %s)', async (verified) => {
    const created = await signup(); if (verified) await verify(); const id = created.body.user.id as string;
    await database.db.collection<{ _id: string; balance: number; revision: number; createdAt: Date; updatedAt: Date }>('ticketWallets')
      .insertOne({ _id: id, balance: 7, revision: 1, createdAt: new Date(), updatedAt: new Date() });
    await database.db.collection('ownedCosmetics').insertOne({ accountId: id, itemId: 'avatar-star-scout', bannerVersion: 'test-catalogue', requestId: 'test-pull', acquiredAt: new Date() });
    const inventoryBefore = await database.db.collection('ownedCosmetics').find().toArray();
    await requestReset(); const code = testAccountEmailInbox.at(-1)!.code;
    expect((await reset(code, 'short')).status).toBe(400);
    const changed = await reset(code); expect(changed.status).toBe(200); expect(changed.headers['set-cookie']).toBeUndefined();
    expect((await me()).status).toBe(401); expect((await signin()).status).not.toBe(200);
    const signed = await signin('new-correct-password'); expect(signed.status).toBe(200); expect(signed.body.user.id).toBe(id);
    expect((await database.db.collection<{ _id: string; balance: number }>('ticketWallets').findOne({ _id: id }))?.balance).toBe(7);
    expect(await database.db.collection('ownedCosmetics').find().toArray()).toEqual(inventoryBefore);
    expect((await reset(code)).status).toBe(400);
  });

  it('revokes old HTTP and socket authorization after reset', async () => {
    await signup(); await verify(); const signed = await signin(); const cookie = signed.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    expect((await me(cookie)).status).toBe(200); const address = app.getHttpServer().address() as { port: number };
    const socket = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], reconnection: false, autoConnect: false,
      extraHeaders: { origin, cookie, 'x-poker-proxy-secret': proxySecret } });
    try {
      await new Promise<void>((resolve, reject) => { socket.once('connection:ready', resolve); socket.once('connect_error', reject); socket.connect(); });
      await requestReset(); expect((await reset(testAccountEmailInbox.at(-1)!.code)).status).toBe(200); expect((await me(cookie)).status).toBe(401);
      expect(await new Promise<unknown>((resolve) => socket.emit('connection:check', {}, resolve))).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    } finally { socket.close(); }
  });

  it('keeps unknown and known responses identical during delivery failure', async () => {
    await signup(); testAccountEmailInbox.length = 0; process.env.ACCOUNT_EMAIL_FAIL_TEST = 'true';
    try {
      const known = await requestReset(); const unknown = await requestReset('unknown@example.com');
      expect(known.status).toBe(200); expect(unknown.status).toBe(known.status); expect(unknown.body).toEqual(known.body);
      expect(known.body).toEqual({ status: true }); expect(testAccountEmailInbox).toHaveLength(0);
      const limited = await requestReset(); expect(limited.status).toBe(429); expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    } finally { delete process.env.ACCOUNT_EMAIL_FAIL_TEST; }
  });

  it('retires GET links without touching account/challenge state or sending email', async () => {
    await signup(); const before = await database.db.collection('user').find().toArray();
    const challenges = await database.db.collection('emailCodeChallenges').find().toArray(); testAccountEmailInbox.length = 0;
    for (const path of ['/api/auth/verify-email?token=old-secret&callbackURL=https://evil.example', '/api/auth/reset-password/old-secret?callbackURL=https://evil.example']) {
      const response = await request(app.getHttpServer()).get(path).set('x-poker-proxy-secret', proxySecret);
      expect(response.status).toBe(302); expect(response.headers.location).not.toContain('old-secret'); expect(response.headers.location).not.toContain('evil');
    }
    expect(await database.db.collection('user').find().toArray()).toEqual(before);
    expect(await database.db.collection('emailCodeChallenges').find().toArray()).toEqual(challenges); expect(testAccountEmailInbox).toHaveLength(0);
  });

  it.each(['/reset-password', '/request-password-reset', '/send-verification-email', '/forget-password', '/email-otp/sign-in', '/email-otp/check-verification-otp', '/email-otp/create-verification-otp', '/email-otp/get-verification-otp', '/email-otp/forget-password', '/email-otp/change-email', '/verify-email/', '/%76erify-email'])('blocks obsolete/unapproved POST %s', async (path) => {
    await signup(); testAccountEmailInbox.length = 0;
    expect((await post(`/api/auth${path}`, { email, otp: '123456', token: 'old-secret', newPassword: 'changed-password' })).status).not.toBe(200);
    expect(testAccountEmailInbox).toHaveLength(0); expect((await database.db.collection('user').findOne({ email }))?.emailVerified).toBe(false);
  });

  it('rejects hostile origin, direct backend, alternate purpose and malformed code', async () => {
    await signup(); testAccountEmailInbox.length = 0;
    expect((await post('/api/auth/email-otp/request-password-reset', { email }).set('origin', 'https://evil.example')).status).toBe(403);
    expect((await request(app.getHttpServer()).post('/api/auth/email-otp/request-password-reset').set('origin', origin).send({ email })).status).toBe(403);
    expect((await post('/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' })).status).toBe(400);
    expect((await verify('12345x')).status).toBe(400); expect(testAccountEmailInbox).toHaveLength(0);
  });
  it('returns unavailable for storage failure without consuming a valid challenge', async () => {
    await signup(); const client = app.get<MongoClient>(MONGO_CLIENT);
    const fault = jest.spyOn(client, 'startSession').mockImplementationOnce(() => { throw new Error('Injected unavailable storage'); });
    try { expect((await verify()).status).toBe(503); } finally { fault.mockRestore(); }
    expect((await verify()).status).toBe(200);
  });
  it('uses the canonical Origin and clean legacy destination with a trailing-slash public URL', async () => {
    await app.close(); process.env.PUBLIC_ORIGIN = `${origin}/`; app = await createApplication(); await app.listen(0, '127.0.0.1');
    expect((await signup()).status).toBe(200); expect((await verify()).status).toBe(200);
    const retired = await request(app.getHttpServer()).get('/api/auth/reset-password/old-secret').set('x-poker-proxy-secret', proxySecret);
    expect(retired.headers.location).toBe(`${origin}/reset-password?notice=link-replaced`);
  });
});
