import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { testAccountEmailInbox } from '../src/modules/identity/accountEmail.service';
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
    testAccountEmailInbox.length = 0;
    await post('/api/auth/request-password-reset', { email: 'friend@example.com', redirectTo: `${origin}/reset-password` });
    const resetLink = new URL(testAccountEmailInbox[0]!.url);
    const callback = await request(app.getHttpServer()).get(resetLink.pathname + resetLink.search)
      .set('x-poker-proxy-secret', proxySecret);
    const token = new URL(String(callback.headers.location)).searchParams.get('token');
    expect((await post('/api/auth/reset-password', { token, newPassword: 'new-correct-password-123' })).status).toBe(200);
    expect((await request(app.getHttpServer()).get('/api/me').set('cookie', cookie)
      .set('x-poker-proxy-secret', proxySecret)).status).toBe(401);
    expect((await post('/api/auth/sign-in/email', { email: 'friend@example.com', password: 'new-correct-password-123' })).status).toBe(200);
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
