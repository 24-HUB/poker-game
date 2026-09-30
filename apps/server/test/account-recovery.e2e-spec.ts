import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io } from 'socket.io-client';
import type { AuthContext } from 'better-auth' with { 'resolution-mode': 'import' };

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { testAccountEmailInbox } from '../src/modules/identity/accountEmail.service';
import { AUTH, type PokerAuth } from '../src/modules/identity/auth';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

const origin = 'https://play.example';
const proxySecret = 'test-proxy-secret';
const password = 'correct-horse-battery-staple';
const registrationCode = 'private-playtest-code';

describe('account recovery', () => {
  let app: INestApplication;
  let database: TestDatabase;
  let restore: () => void;

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    const values: Record<string, string> = {
      MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
      MONGODB_DATABASE: database.db.databaseName,
      PROXY_SECRET: proxySecret,
      PUBLIC_ORIGIN: origin,
      BETTER_AUTH_SECRET: 'test-better-auth-secret-with-32-characters',
      REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
      ACCOUNT_EMAIL_TRANSPORT: 'memory',
      ACCOUNT_RECOVERY_ENFORCED: 'true',
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

  const post = (path: string, body: object) => request(app.getHttpServer())
    .post(path).set('origin', origin).set('x-poker-proxy-secret', proxySecret).send(body);

  it('verifies a new account without changing its identity', async () => {
    const signup = await post('/api/auth/sign-up/email', {
      name: 'Friend', email: 'friend@example.com', password, registrationCode,
    });
    expect(signup.status).toBe(200);
    expect(signup.body.token).toBeNull();
    expect(testAccountEmailInbox).toHaveLength(1);
    const denied = await post('/api/auth/sign-in/email', { email: 'friend@example.com', password });
    expect(denied.status).not.toBe(200);
    const verified = await request(app.getHttpServer()).get(new URL(testAccountEmailInbox[0]!.url).pathname + new URL(testAccountEmailInbox[0]!.url).search)
      .set('x-poker-proxy-secret', proxySecret);
    expect(verified.status).toBe(302);
    const signin = await post('/api/auth/sign-in/email', { email: 'friend@example.com', password });
    expect(signin.status).toBe(200);
    expect(signin.body.user.id).toBe(signup.body.user.id);
  });

  it('returns a generic response for unknown reset addresses and consumes reset tokens once', async () => {
    await post('/api/auth/sign-up/email', {
      name: 'Friend', email: 'friend@example.com', password, registrationCode,
    });
    testAccountEmailInbox.length = 0;
    const unknown = await post('/api/auth/request-password-reset', { email: 'unknown@example.com', redirectTo: `${origin}/reset-password` });
    const known = await post('/api/auth/request-password-reset', { email: 'friend@example.com', redirectTo: `${origin}/reset-password` });
    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(testAccountEmailInbox).toHaveLength(1);
    const link = new URL(testAccountEmailInbox[0]!.url);
    const callback = await request(app.getHttpServer()).get(link.pathname + link.search)
      .set('x-poker-proxy-secret', proxySecret);
    expect(callback.status).toBe(302);
    const token = new URL(String(callback.headers.location)).searchParams.get('token');
    expect(token).toBeTruthy();
    const first = await post('/api/auth/reset-password', { token, newPassword: 'new-correct-password-123' });
    expect(first.status).toBe(200);
    const reused = await post('/api/auth/reset-password', { token, newPassword: 'another-password-123' });
    expect(reused.status).not.toBe(200);
  });

  it('revokes all prior sessions after reset', async () => {
    await post('/api/auth/sign-up/email', {
      name: 'Friend', email: 'friend@example.com', password, registrationCode,
    });
    const verification = new URL(testAccountEmailInbox[0]!.url);
    await request(app.getHttpServer()).get(verification.pathname + verification.search).set('x-poker-proxy-secret', proxySecret);
    const signin = await post('/api/auth/sign-in/email', { email: 'friend@example.com', password });
    const cookie = signin.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    expect((await request(app.getHttpServer()).get('/api/me').set('cookie', cookie)
      .set('x-poker-proxy-secret', proxySecret)).status).toBe(200);
    const address = app.getHttpServer().address() as { port: number };
    const socket = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], autoConnect: false,
      reconnection: false, extraHeaders: { origin, cookie, 'x-poker-proxy-secret': proxySecret } });
    await new Promise<void>((resolve, reject) => {
      socket.once('connection:ready', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
    testAccountEmailInbox.length = 0;
    await post('/api/auth/request-password-reset', { email: 'friend@example.com', redirectTo: `${origin}/reset-password` });
    const resetLink = new URL(testAccountEmailInbox[0]!.url);
    const callback = await request(app.getHttpServer()).get(resetLink.pathname + resetLink.search)
      .set('x-poker-proxy-secret', proxySecret);
    const token = new URL(String(callback.headers.location)).searchParams.get('token');
    expect((await post('/api/auth/reset-password', { token, newPassword: 'new-correct-password-123' })).status).toBe(200);
    expect((await request(app.getHttpServer()).get('/api/me').set('cookie', cookie)
      .set('x-poker-proxy-secret', proxySecret)).status).toBe(401);
    try {
      const reply = await new Promise<unknown>((resolve) => socket.emit('connection:check', {}, resolve));
      expect(reply).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    } finally { socket.close(); }
    expect((await post('/api/auth/sign-in/email', { email: 'friend@example.com', password: 'new-correct-password-123' })).status).toBe(200);
  });

  it.each([
    { operation: 'updatePassword' as const, afterWrite: true },
    { operation: 'deleteUserSessions' as const, afterWrite: false },
    { operation: 'deleteUserSessions' as const, afterWrite: true },
  ])(
    'rolls back an interrupted reset at $operation (afterWrite=$afterWrite) and allows the same link to retry',
    async ({ operation, afterWrite }) => {
      await post('/api/auth/sign-up/email', {
        name: 'Friend', email: 'friend@example.com', password, registrationCode,
      });
      const verification = new URL(testAccountEmailInbox[0]!.url);
      await request(app.getHttpServer()).get(verification.pathname + verification.search)
        .set('x-poker-proxy-secret', proxySecret);
      const signin = await post('/api/auth/sign-in/email', { email: 'friend@example.com', password });
      expect(signin.status).toBe(200);
      const cookie = signin.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
      const credential = await database.db.collection('account').findOne({ providerId: 'credential' });
      expect(credential?.password).toBeTruthy();
      const readSession = () => request(app.getHttpServer()).get('/api/me').set('cookie', cookie)
        .set('x-poker-proxy-secret', proxySecret);

      testAccountEmailInbox.length = 0;
      await post('/api/auth/request-password-reset', {
        email: 'friend@example.com', redirectTo: `${origin}/reset-password`,
      });
      const token = new URL(testAccountEmailInbox[0]!.url).pathname.split('/').at(-1);
      const auth = app.get<PokerAuth & { $context: Promise<AuthContext> }>(AUTH);
      const { internalAdapter } = await auth.$context;
      const originalUpdate = internalAdapter.updatePassword.bind(internalAdapter);
      const originalRevoke = internalAdapter.deleteUserSessions.bind(internalAdapter);
      // Fail after the actual MongoDB write, so rollback must undo partial effects.
      const fault = operation === 'updatePassword'
        ? jest.spyOn(internalAdapter, 'updatePassword').mockImplementationOnce(async (...args) => {
          await originalUpdate(...args);
          throw new Error('Injected password update interruption');
        })
        : jest.spyOn(internalAdapter, 'deleteUserSessions').mockImplementationOnce(async (...args) => {
          if (afterWrite) await originalRevoke(...args);
          throw new Error('Injected session revocation interruption');
        });
      try {
        expect((await post('/api/auth/reset-password', { token, newPassword: 'new-correct-password-123' })).status).toBe(500);
      } finally { fault.mockRestore(); }

      const unchanged = await database.db.collection('account').findOne({ _id: credential!._id });
      expect(unchanged?.password === credential!.password).toBe(true);
      expect((await readSession()).status).toBe(200);
      expect(await database.db.collection('verification').countDocuments({ identifier: `reset-password:${token}` })).toBe(1);
      expect((await post('/api/auth/reset-password', { token, newPassword: 'new-correct-password-123' })).status).toBe(200);
      expect((await readSession()).status).toBe(401);
      expect((await post('/api/auth/sign-in/email', { email: 'friend@example.com', password: 'new-correct-password-123' })).status).toBe(200);
      expect((await post('/api/auth/reset-password', { token, newPassword: 'another-password-123' })).status).toBe(400);
    },
  );

  it('accepts only one simultaneous reset with the same token', async () => {
    await post('/api/auth/sign-up/email', {
      name: 'Friend', email: 'friend@example.com', password, registrationCode,
    });
    const verification = new URL(testAccountEmailInbox[0]!.url);
    await request(app.getHttpServer()).get(verification.pathname + verification.search)
      .set('x-poker-proxy-secret', proxySecret);
    await post('/api/auth/request-password-reset', {
      email: 'friend@example.com', redirectTo: `${origin}/reset-password`,
    });
    const token = new URL(testAccountEmailInbox.at(-1)!.url).pathname.split('/').at(-1);
    const responses = await Promise.all(['first-new-password', 'second-new-password'].map((newPassword) =>
      post('/api/auth/reset-password', { token, newPassword }),
    ));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    const winningPassword = responses[0]!.status === 200 ? 'first-new-password' : 'second-new-password';
    expect((await post('/api/auth/sign-in/email', { email: 'friend@example.com', password: winningPassword })).status).toBe(200);
    expect((await post('/api/auth/reset-password', { token, newPassword: 'third-new-password' })).status).toBe(400);
  });

  it('requires existing unverified accounts to verify while keeping their identity and balance', async () => {
    const signup = await post('/api/auth/sign-up/email', {
      name: 'Legacy friend', email: 'legacy@example.com', password, registrationCode,
    });
    const initial = new URL(testAccountEmailInbox[0]!.url);
    await request(app.getHttpServer()).get(initial.pathname + initial.search).set('x-poker-proxy-secret', proxySecret);
    const signin = await post('/api/auth/sign-in/email', { email: 'legacy@example.com', password });
    const cookie = signin.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    await database.db.collection('user').updateOne({ email: 'legacy@example.com' }, { $set: { emailVerified: false } });
    await database.db.collection<{ _id: string; balance: number; revision: number; createdAt: Date; updatedAt: Date }>('ticketWallets')
      .insertOne({ _id: signup.body.user.id as string, balance: 7, revision: 1, createdAt: new Date(), updatedAt: new Date() });
    expect((await request(app.getHttpServer()).get('/api/wallet').set('cookie', cookie)
      .set('x-poker-proxy-secret', proxySecret)).status).toBe(401);
    testAccountEmailInbox.length = 0;
    expect((await post('/api/auth/send-verification-email', { email: 'legacy@example.com', callbackURL: origin })).status).toBe(200);
    const link = new URL(testAccountEmailInbox[0]!.url);
    await request(app.getHttpServer()).get(link.pathname + link.search).set('x-poker-proxy-secret', proxySecret);
    const recovered = await request(app.getHttpServer()).get('/api/wallet').set('cookie', cookie)
      .set('x-poker-proxy-secret', proxySecret);
    expect(recovered.status).toBe(200);
    expect(recovered.body.data.balance).toBe(7);
    expect(await database.db.collection('user').countDocuments({ email: 'legacy@example.com' })).toBe(1);
  });

  it('rejects an expired token and limits reset requests', async () => {
    await post('/api/auth/sign-up/email', {
      name: 'Friend', email: 'friend@example.com', password, registrationCode,
    });
    testAccountEmailInbox.length = 0;
    const body = { email: 'friend@example.com', redirectTo: `${origin}/reset-password` };
    for (let index = 0; index < 3; index += 1) {
      expect((await post('/api/auth/request-password-reset', body)).status).toBe(200);
    }
    expect((await post('/api/auth/request-password-reset', body)).status).toBe(429);
    const resetLink = new URL(testAccountEmailInbox[0]!.url);
    const token = resetLink.pathname.split('/').at(-1);
    await database.db.collection('verification').updateOne(
      { identifier: `reset-password:${token}` }, { $set: { expiresAt: new Date(0) } },
    );
    const expired = await post('/api/auth/reset-password', { token, newPassword: 'new-correct-password-123' });
    expect(expired.status).not.toBe(200);
  });

  it('limits recovery by trusted client IP without exhausting another friend allowance', async () => {
    const body = { email: 'unknown@example.com', redirectTo: `${origin}/reset-password` };
    for (let index = 0; index < 3; index += 1) {
      expect((await post('/api/auth/request-password-reset', body).set('x-poker-client-ip', '203.0.113.7')).status).toBe(200);
    }
    expect((await post('/api/auth/request-password-reset', body).set('x-poker-client-ip', '203.0.113.7')).status).toBe(429);
    expect((await post('/api/auth/request-password-reset', body).set('x-poker-client-ip', '203.0.113.8')).status).toBe(200);
  });

  it('rejects recovery redirects outside the public origin without sending a link', async () => {
    await post('/api/auth/sign-up/email', { name: 'Friend', email: 'friend@example.com', password, registrationCode });
    testAccountEmailInbox.length = 0;
    expect((await post('/api/auth/request-password-reset', { email: 'friend@example.com', redirectTo: 'https://evil.example/reset' })).status).not.toBe(200);
    expect((await post('/api/auth/send-verification-email', { email: 'friend@example.com', callbackURL: 'https://evil.example' })).status).not.toBe(200);
    expect(testAccountEmailInbox).toHaveLength(0);
  });

  it('reports delivery failure safely and lets a later request retry', async () => {
    await post('/api/auth/sign-up/email', {
      name: 'Friend', email: 'friend@example.com', password, registrationCode,
    });
    testAccountEmailInbox.length = 0;
    process.env.ACCOUNT_EMAIL_FAIL_TEST = 'true';
    try {
      const failed = await post('/api/auth/request-password-reset', {
        email: 'friend@example.com', redirectTo: `${origin}/reset-password`,
      });
      expect(failed.status).toBe(200);
      expect(failed.body).toEqual({
        status: true,
        message: 'If this email exists in our system, check your email for the reset link',
      });
      expect(JSON.stringify(failed.body)).not.toContain('friend@example.com');
      expect(testAccountEmailInbox).toHaveLength(0);
    } finally {
      delete process.env.ACCOUNT_EMAIL_FAIL_TEST;
    }
    const retried = await post('/api/auth/request-password-reset', {
      email: 'friend@example.com', redirectTo: `${origin}/reset-password`,
    });
    expect(retried.status).toBe(200);
    expect(testAccountEmailInbox).toHaveLength(1);
  });
});
