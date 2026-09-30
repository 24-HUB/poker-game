import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { testAccountEmailInbox } from '../src/modules/identity/accountEmail.service';
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

  async function createAccount(email: string): Promise<{ id: string; cookie: string }> {
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
    return { id: signup.body.user.id as string, cookie: signin.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '' };
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
});
