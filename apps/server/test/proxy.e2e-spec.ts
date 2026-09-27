import { randomBytes } from 'node:crypto';
import { connect, type Socket } from 'node:net';

import request from 'supertest';

import { AuthorityLease } from '../src/authority/authorityLease';
import { verifyProxyRequest } from '../src/common/proxyGuard';
import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { createTestDatabase } from './support/testDatabase';

describe('direct backend protection', () => {
  it('rejectsDirectBackendSpoof', async () => {
    const database = await createTestDatabase();
    await applyMigrations(database.db);
    const previous = {
      uri: process.env.MONGODB_URI,
      database: process.env.MONGODB_DATABASE,
      secret: process.env.PROXY_SECRET,
      publicOrigin: process.env.PUBLIC_ORIGIN,
    };
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
    process.env.MONGODB_DATABASE = database.db.databaseName;
    process.env.PROXY_SECRET = 'trusted-proxy-secret';
    process.env.PUBLIC_ORIGIN = 'https://play.example';

    const application = await createApplication();
    await application.init();
    try {
      expect(verifyProxyRequest({ 'x-poker-proxy-secret': 'trusted-proxy-secret' })).toBe(true);
      expect((await request(application.getHttpServer())
        .get('/api/health/ready')
        .set('x-forwarded-host', 'play.example')
        .set('x-forwarded-proto', 'https')).status).toBe(403);
      expect((await request(application.getHttpServer())
        .get('/api/health/ready')
        .set('x-poker-proxy-secret', 'trusted-proxy-secret')).status).toBe(200);
      expect((await request(application.getHttpServer())
        .post('/api/not-a-real-route')
        .set('x-poker-proxy-secret', 'trusted-proxy-secret')
        .set('origin', 'https://evil.example')).status).toBe(403);
      expect((await request(application.getHttpServer()).get('/health/deploy')).status).toBe(200);
    } finally {
      await application.close();
      await database.dispose();
      restoreEnvironment('MONGODB_URI', previous.uri);
      restoreEnvironment('MONGODB_DATABASE', previous.database);
      restoreEnvironment('PROXY_SECRET', previous.secret);
      restoreEnvironment('PUBLIC_ORIGIN', previous.publicOrigin);
    }
  });

  it('acceptsRealProxiedSocketIoUpgrade', async () => {
    const database = await createTestDatabase();
    await applyMigrations(database.db);
    const previous = configureEnvironment(database.db.databaseName);
    const application = await createApplication();
    await application.listen(0, '127.0.0.1');

    try {
      const address = application.getHttpServer().address() as { port: number };
      const statusLine = await performSocketIoUpgrade(address.port, {
        origin: 'https://play.example',
        secret: 'trusted-proxy-secret',
      });

      expect(statusLine).toBe('HTTP/1.1 101 Switching Protocols');
    } finally {
      await application.close();
      await database.dispose();
      restoreConfiguredEnvironment(previous);
    }
  });

  it('rejectsUntrustedSocketIoUpgrades', async () => {
    const database = await createTestDatabase();
    await applyMigrations(database.db);
    const previous = configureEnvironment(database.db.databaseName);
    const application = await createApplication();
    await application.listen(0, '127.0.0.1');

    try {
      const address = application.getHttpServer().address() as { port: number };
      const forgedSecret = await performSocketIoUpgrade(address.port, {
        origin: 'https://play.example',
        secret: 'forged-secret',
      });
      const hostileOrigin = await performSocketIoUpgrade(address.port, {
        origin: 'https://evil.example',
        secret: 'trusted-proxy-secret',
      });

      expect(forgedSecret).not.toBe('HTTP/1.1 101 Switching Protocols');
      expect(hostileOrigin).not.toBe('HTTP/1.1 101 Switching Protocols');
    } finally {
      await application.close();
      await database.dispose();
      restoreConfiguredEnvironment(previous);
    }
  });

  it('closesSocketsBeforeReleasingAuthority', async () => {
    const database = await createTestDatabase();
    await applyMigrations(database.db);
    const previous = configureEnvironment(database.db.databaseName);
    const application = await createApplication();
    await application.listen(0, '127.0.0.1');

    const address = application.getHttpServer().address() as { port: number };
    const upgrade = await openSocketIoUpgrade(address.port, {
      origin: 'https://play.example',
      secret: 'trusted-proxy-secret',
    });
    expect(upgrade.statusLine).toBe('HTTP/1.1 101 Switching Protocols');
    upgrade.socket.once('data', () => upgrade.socket.destroy());

    const authority = application.get(AuthorityLease);
    const release = authority.release.bind(authority);
    let releaseObservedClosedSocket = false;
    jest.spyOn(authority, 'release').mockImplementation(async (token) => {
      releaseObservedClosedSocket = upgrade.socket.destroyed;
      await release(token);
    });

    try {
      await application.close();
      expect(releaseObservedClosedSocket).toBe(true);
    } finally {
      upgrade.socket.destroy();
      await database.dispose();
      restoreConfiguredEnvironment(previous);
    }
  });
});

function configureEnvironment(databaseName: string): Record<string, string | undefined> {
  const previous = {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DATABASE: process.env.MONGODB_DATABASE,
    PROXY_SECRET: process.env.PROXY_SECRET,
    PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN,
  };
  process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
  process.env.MONGODB_DATABASE = databaseName;
  process.env.PROXY_SECRET = 'trusted-proxy-secret';
  process.env.PUBLIC_ORIGIN = 'https://play.example';
  return previous;
}

function restoreConfiguredEnvironment(previous: Record<string, string | undefined>): void {
  for (const [name, value] of Object.entries(previous)) restoreEnvironment(name, value);
}

async function performSocketIoUpgrade(port: number, headers: { origin: string; secret: string }): Promise<string> {
  const upgrade = await openSocketIoUpgrade(port, headers);
  upgrade.socket.destroy();
  return upgrade.statusLine;
}

async function openSocketIoUpgrade(
  port: number,
  headers: { origin: string; secret: string },
): Promise<{ statusLine: string; socket: Socket }> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1');
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Socket.IO upgrade timed out'));
    }, 2_000);
    socket.setEncoding('utf8');
    socket.once('connect', () => {
      socket.write([
        'GET /socket.io/?EIO=4&transport=websocket HTTP/1.1',
        `Host: 127.0.0.1:${port}`,
        'Connection: Upgrade',
        'Upgrade: websocket',
        'Sec-WebSocket-Version: 13',
        `Sec-WebSocket-Key: ${randomBytes(16).toString('base64')}`,
        `Origin: ${headers.origin}`,
        `x-poker-proxy-secret: ${headers.secret}`,
        '',
        '',
      ].join('\r\n'));
    });
    socket.once('data', (data: string) => {
      clearTimeout(timeout);
      resolve({ statusLine: data.split('\r\n', 1)[0] ?? '', socket });
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
