import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { MongoClient } from 'mongodb';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';

import { applyMigrations } from '../src/database/migrate';
import { MONGO_CLIENT } from '../src/database/database.tokens';
import { createApplication } from '../src/main';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

const mongoUri = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
const proxySecret = 'test-proxy-secret';
const publicOrigin = 'https://play.example';
const registrationCode = 'private-playtest-code';

describe('identity', () => {
  let application: INestApplication;
  let database: TestDatabase;
  let restoreEnvironment: () => void;

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    restoreEnvironment = setIdentityEnvironment(database.db.databaseName);
    application = await createApplication();
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    if (application) await application.close();
    if (restoreEnvironment) restoreEnvironment();
    if (database) await database.dispose();
  });

  it('rejects an invalid registration code without creating an account', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name: 'Tester',
        email: 'tester@example.com',
        password: 'correct-horse-battery-staple',
        registrationCode: 'wrong-code',
      });

    expect(response.status).toBe(403);
    expect(await database.db.collection('user').countDocuments()).toBe(0);
  });

  it('creates an account through the native auth response without persisting the registration code', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name: 'Tester',
        email: 'tester@example.com',
        password: 'correct-horse-battery-staple',
        registrationCode,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: { id: expect.any(String), name: 'Tester', email: 'tester@example.com' },
    });
    expect(response.body).not.toHaveProperty('data');
    expect(response.headers['set-cookie']?.[0]).toEqual(expect.stringContaining('HttpOnly'));
    expect(response.headers['set-cookie']?.[0]).toEqual(expect.stringContaining('Secure'));
    expect(response.headers['set-cookie']?.[0]).not.toEqual(expect.stringContaining('Domain='));

    const storedUser = await database.db.collection('user').findOne({ email: 'tester@example.com' });
    expect(storedUser).not.toHaveProperty('registrationCode');
    expect(JSON.stringify(storedUser)).not.toContain(registrationCode);
  });

  it('resolves the same persisted session for the enveloped account endpoint', async () => {
    const signUp = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name: 'Session Tester',
        email: 'session@example.com',
        password: 'correct-horse-battery-staple',
        registrationCode,
      });
    const cookie = signUp.headers['set-cookie']?.[0];

    const response = await request(application.getHttpServer())
      .get('/api/me')
      .set('cookie', cookie ?? '')
      .set('x-poker-proxy-secret', proxySecret);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { accountId: signUp.body.user.id, displayName: 'Session Tester' },
      error: null,
    });
  });

  it('returns an enveloped unauthenticated result when the session is missing', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/me')
      .set('x-poker-proxy-secret', proxySecret);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      data: null,
      error: { code: 'UNAUTHENTICATED', message: 'A valid session is required.' },
    });
  });

  it('parses a native sign-in body once and issues a new session cookie', async () => {
    await signUp('signin@example.com', 'Sign In Tester');

    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-in/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({ email: 'signin@example.com', password: 'correct-horse-battery-staple' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      redirect: false,
      token: expect.any(String),
      user: { email: 'signin@example.com', name: 'Sign In Tester' },
    });
    expect(response.body).not.toHaveProperty('data');
    expect(response.headers['set-cookie']?.[0]).toEqual(expect.stringContaining('HttpOnly'));
  });

  it('rejects a duplicate email without creating a second account', async () => {
    await signUp('duplicate@example.com', 'First Tester');

    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name: 'Second Tester',
        email: 'duplicate@example.com',
        password: 'another-correct-password',
        registrationCode,
      });

    expect(response.status).toBe(422);
    expect(await database.db.collection('user').countDocuments({ email: 'duplicate@example.com' })).toBe(1);
  });

  it('rejects an untrusted mutation origin before account creation', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', 'https://attacker.example')
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name: 'Attacker',
        email: 'attacker@example.com',
        password: 'correct-horse-battery-staple',
        registrationCode,
      });

    expect(response.status).toBe(403);
    expect(await database.db.collection('user').countDocuments()).toBe(0);
  });

  it.each([
    ['short', '1234567'],
    ['long', 'x'.repeat(129)],
  ])('rejects a %s password outside the 8–128 character boundary', async (_case, password) => {
    const response = await request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name: 'Boundary Tester',
        email: `${_case}@example.com`,
        password,
        registrationCode,
      });

    expect(response.status).toBe(400);
    expect(await database.db.collection('user').countDocuments()).toBe(0);
  });

  it('derives socket identity from the session instead of a forged account id', async () => {
    const signUpResponse = await signUp('socket@example.com', 'Socket Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const socket = connectSocket(cookie);

    try {
      await waitForConnect(socket);
      const acknowledgement = await emitWithAck(socket, 'connection:check', { accountId: 'forged-account' });

      expect(acknowledgement).toEqual({
        data: { accountId: signUpResponse.body.user.id },
        error: null,
      });
    } finally {
      socket.close();
    }
  });

  it('rejects and disconnects a socket immediately after its session is revoked', async () => {
    const signUpResponse = await signUp('revoked@example.com', 'Revoked Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const socket = connectSocket(cookie);

    try {
      await waitForConnect(socket);
      expect(await emitWithAck(socket, 'connection:check', {})).toMatchObject({ error: null });
      await database.db.collection('session').deleteOne({ token: signUpResponse.body.token });

      const acknowledgement = await emitWithAck(socket, 'connection:check', {});

      expect(acknowledgement).toEqual({
        data: null,
        error: { code: 'UNAUTHENTICATED', message: 'A valid session is required.' },
      });
      await waitForDisconnect(socket);
      expect(socket.connected).toBe(false);
    } finally {
      socket.close();
    }
  });

  it('reports a database outage as unavailable instead of signed out', async () => {
    const signUpResponse = await signUp('outage@example.com', 'Outage Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const client = application.get<MongoClient>(MONGO_CLIENT);
    await client.close();
    try {
      const response = await request(application.getHttpServer())
        .get('/api/me')
        .set('cookie', cookie)
        .set('x-poker-proxy-secret', proxySecret);

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        data: null,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Session verification is temporarily unavailable.',
        },
      });
    } finally {
      await client.connect();
    }
  });

  it('rejects malformed socket payloads with one structured acknowledgement', async () => {
    const signUpResponse = await signUp('malformed@example.com', 'Malformed Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const socket = connectSocket(cookie);

    try {
      await waitForConnect(socket);
      const acknowledgement = await emitWithAck(socket, 'connection:check', 'not-an-object');

      expect(acknowledgement).toEqual({
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'The socket payload is invalid.' },
      });
      expect(socket.connected).toBe(true);
    } finally {
      socket.close();
    }
  });

  it('tolerates a missing acknowledgement callback without poisoning the socket', async () => {
    const signUpResponse = await signUp('no-ack@example.com', 'No Ack Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const socket = connectSocket(cookie);

    try {
      await waitForConnect(socket);
      socket.emit('connection:check', {});
      await new Promise((resolve) => setTimeout(resolve, 25));

      expect(await emitWithAck(socket, 'connection:check', {})).toMatchObject({ error: null });
    } finally {
      socket.close();
    }
  });

  it('rejects and disconnects a socket whose persisted session has expired', async () => {
    const signUpResponse = await signUp('expired@example.com', 'Expired Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    await database.db.collection('session').updateOne(
      { token: signUpResponse.body.token },
      { $set: { expiresAt: new Date(0) } },
    );
    const socket = connectSocket(cookie);

    try {
      await waitForConnect(socket);
      expect(await emitWithAck(socket, 'connection:check', {})).toMatchObject({
        data: null,
        error: { code: 'UNAUTHENTICATED' },
      });
      await waitForDisconnect(socket);
    } finally {
      socket.close();
    }
  });

  it('reports socket session storage outages without disconnecting the caller', async () => {
    const signUpResponse = await signUp('socket-outage@example.com', 'Socket Outage Tester');
    const cookie = signUpResponse.headers['set-cookie']?.[0]?.split(';', 1)[0] ?? '';
    const socket = connectSocket(cookie);
    const client = application.get<MongoClient>(MONGO_CLIENT);

    try {
      await waitForConnect(socket);
      await client.close();
      expect(await emitWithAck(socket, 'connection:check', {})).toEqual({
        data: null,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Session verification is temporarily unavailable.',
        },
      });
      expect(socket.connected).toBe(true);
      await client.connect();
      expect(await emitWithAck(socket, 'connection:check', {})).toMatchObject({ error: null });
    } finally {
      await client.connect();
      socket.close();
    }
  });

  async function signUp(email: string, name: string) {
    return request(application.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('origin', publicOrigin)
      .set('x-poker-proxy-secret', proxySecret)
      .send({
        name,
        email,
        password: 'correct-horse-battery-staple',
        registrationCode,
      });
  }

  function connectSocket(cookie: string): Socket {
    const address = application.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Expected a listening TCP server');
    return io(`http://127.0.0.1:${address.port}`, {
      path: '/socket.io',
      transports: ['websocket'],
      extraHeaders: {
        cookie,
        origin: publicOrigin,
        'x-poker-proxy-secret': proxySecret,
      },
    });
  }
});

function waitForConnect(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

function emitWithAck(socket: Socket, event: string, payload: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No acknowledgement for ${event}`)), 500);
    socket.emit(event, payload, (reply: unknown) => {
      clearTimeout(timeout);
      resolve(reply);
    });
  });
}

function waitForDisconnect(socket: Socket): Promise<void> {
  if (!socket.connected) return Promise.resolve();
  return new Promise((resolve) => socket.once('disconnect', () => resolve()));
}

function setIdentityEnvironment(databaseName: string): () => void {
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
