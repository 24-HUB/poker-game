import request from 'supertest';

import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { startAuthorityProcess } from './support/authorityProcessHarness';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

const mongoUri = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
type RoomFixture = {
  _id: string;
  hostAccountId: string;
  title: string;
  status: 'OPEN' | 'CLOSED';
  revision: number;
  authorityBootId: string;
  createdAt: Date;
  expiresAt: Date;
  closedReason?: string;
};
type MembershipFixture = { roomId: string; accountId: string; seat: number | null; joinedAt: Date; leftAt?: Date };

describe('backend authority', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
  });

  afterEach(async () => {
    await database.dispose();
  });

  it('onlyOneOwnerCommits', async () => {
    const [first, second] = await Promise.all([
      startAuthorityProcess(mongoUri, database.db.databaseName),
      startAuthorityProcess(mongoUri, database.db.databaseName),
    ]);
    try {
      expect([first.ready, second.ready].filter(Boolean)).toHaveLength(1);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });

  it('oldEpochCannotCommit', async () => {
    const first = new AuthorityLease(database.db, 'boot-a');
    const second = new AuthorityLease(database.db, 'boot-b');
    const staleToken = await first.acquire();
    expect(staleToken).not.toBeNull();

    await database.db.collection<{ _id: string }>('authorityLeases').updateOne(
      { _id: 'backend' },
      { $set: { expiresAt: new Date(0) } },
    );
    const currentToken = await second.acquire();
    expect(currentToken).not.toBeNull();

    const session = database.client.startSession();
    try {
      await expect(session.withTransaction(async () => {
        await first.fence(session, staleToken!);
      })).rejects.toMatchObject({ code: 'AUTHORITY_LOST' });
    } finally {
      await session.endSession();
    }
  });

  it('standbyCanPassDeployHealth', async () => {
    const previousUri = process.env.MONGODB_URI;
    const previousDatabase = process.env.MONGODB_DATABASE;
    const previousSecret = process.env.PROXY_SECRET;
    const previousPublicOrigin = process.env.PUBLIC_ORIGIN;
    process.env.MONGODB_URI = mongoUri;
    process.env.MONGODB_DATABASE = database.db.databaseName;
    process.env.PROXY_SECRET = 'test-proxy-secret';
    process.env.PUBLIC_ORIGIN = 'https://play.example';

    const owner = await createApplication();
    const standby = await createApplication();
    await owner.init();
    await standby.init();

    try {
      const deploy = await request(standby.getHttpServer()).get('/health/deploy');
      const ready = await request(standby.getHttpServer())
        .get('/api/health/ready')
        .set('x-poker-proxy-secret', 'test-proxy-secret');

      expect(deploy.status).toBe(200);
      expect(ready.status).toBe(503);
    } finally {
      await standby.close();
      await owner.close();
      if (previousUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousUri;
      if (previousDatabase === undefined) delete process.env.MONGODB_DATABASE;
      else process.env.MONGODB_DATABASE = previousDatabase;
      if (previousSecret === undefined) delete process.env.PROXY_SECRET;
      else process.env.PROXY_SECRET = previousSecret;
      if (previousPublicOrigin === undefined) delete process.env.PUBLIC_ORIGIN;
      else process.env.PUBLIC_ORIGIN = previousPublicOrigin;
    }
  });

  it('gracefulReleaseAllowsImmediateTakeover', async () => {
    const first = new AuthorityLease(database.db, 'boot-a');
    const second = new AuthorityLease(database.db, 'boot-b');
    const firstToken = await first.acquire();
    expect(firstToken).not.toBeNull();

    await first.release(firstToken!);
    const secondToken = await second.acquire();

    expect(secondToken).toMatchObject({ bootId: 'boot-b', epoch: firstToken!.epoch + 1 });
  });

  it('standbyRetriesAfterGracefulOwnerShutdown', async () => {
    await withDatabaseEnvironment(async () => {
      const owner = await createApplication();
      const standby = await createApplication();
      await owner.init();
      await standby.init();

      try {
        expect((await request(standby.getHttpServer())
          .get('/api/health/ready')
          .set('x-poker-proxy-secret', 'test-proxy-secret')).status).toBe(503);
        await owner.close();

        let status = 503;
        for (let attempt = 0; attempt < 20 && status !== 200; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          status = (await request(standby.getHttpServer())
            .get('/api/health/ready')
            .set('x-poker-proxy-secret', 'test-proxy-secret')).status;
        }
        expect(status).toBe(200);
      } finally {
        await standby.close();
      }
    });
  });

  it('pausedOwnerCannotResumeAfterReplacement', async () => {
    const first = new AuthorityLease(database.db, 'boot-a', { leaseDurationMs: 80 });
    const second = new AuthorityLease(database.db, 'boot-b', { leaseDurationMs: 80 });
    const firstToken = await first.acquire();
    expect(firstToken).not.toBeNull();
    first.markReady(firstToken!);

    await new Promise((resolve) => setTimeout(resolve, 120));
    const secondToken = await second.acquire();
    const renewed = await first.renew(firstToken!);

    expect(secondToken).toMatchObject({ bootId: 'boot-b', epoch: firstToken!.epoch + 1 });
    expect(renewed).toBe(false);
    expect(first.isReady()).toBe(false);
  });

  it('standbyNeverRunsStartupCleanup', async () => {
    const owner = new AuthorityLease(database.db, 'existing-owner');
    const ownerToken = await owner.acquire();
    expect(ownerToken).not.toBeNull();
    await insertRoom('stale-room', 'OPEN', 'dead-owner');
    await insertMembership('stale-room', 'account-a', 0);

    await withDatabaseEnvironment(async () => {
      const standby = await createApplication();
      await standby.init();
      try {
        expect(await database.db.collection<RoomFixture>('rooms').findOne({ _id: 'stale-room' })).toMatchObject({ status: 'OPEN' });
        expect(await database.db.collection<MembershipFixture>('roomMemberships').findOne({ roomId: 'stale-room' })).toMatchObject({ seat: 0 });
      } finally {
        await standby.close();
      }
    });
    await owner.release(ownerToken!);
  });

  it('replacementClosesPreviousRoomsButKeepsCompletedRecords', async () => {
    await insertRoom('stale-room', 'OPEN', 'dead-owner');
    await insertRoom('completed-room', 'CLOSED', 'dead-owner');
    await insertMembership('stale-room', 'account-a', 0);
    await insertMembership('completed-room', 'account-b', 1);

    await withDatabaseEnvironment(async () => {
      const replacement = await createApplication();
      await replacement.init();
      try {
        expect(await database.db.collection<RoomFixture>('rooms').findOne({ _id: 'stale-room' })).toMatchObject({
          status: 'CLOSED',
          closedReason: 'RESTARTED',
        });
        expect(await database.db.collection<MembershipFixture>('roomMemberships').findOne({ roomId: 'stale-room' })).toMatchObject({
          seat: null,
          leftAt: expect.any(Date),
        });
        expect(await database.db.collection<RoomFixture>('rooms').findOne({ _id: 'completed-room' })).toMatchObject({
          status: 'CLOSED',
          revision: 0,
        });
        expect(await database.db.collection<MembershipFixture>('roomMemberships').findOne({ roomId: 'completed-room' })).toMatchObject({
          seat: 1,
        });
      } finally {
        await replacement.close();
      }
    });
  });

  async function insertRoom(roomId: string, status: 'OPEN' | 'CLOSED', authorityBootId: string): Promise<void> {
    await database.db.collection<RoomFixture>('rooms').insertOne({
      _id: roomId,
      hostAccountId: `host-${roomId}`,
      title: roomId,
      status,
      revision: 0,
      authorityBootId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  async function insertMembership(roomId: string, accountId: string, seat: number): Promise<void> {
    await database.db.collection<MembershipFixture>('roomMemberships').insertOne({
      roomId,
      accountId,
      seat,
      joinedAt: new Date(),
    });
  }

  async function withDatabaseEnvironment(work: () => Promise<void>): Promise<void> {
    const previousUri = process.env.MONGODB_URI;
    const previousDatabase = process.env.MONGODB_DATABASE;
    const previousSecret = process.env.PROXY_SECRET;
    const previousPublicOrigin = process.env.PUBLIC_ORIGIN;
    process.env.MONGODB_URI = mongoUri;
    process.env.MONGODB_DATABASE = database.db.databaseName;
    process.env.PROXY_SECRET = 'test-proxy-secret';
    process.env.PUBLIC_ORIGIN = 'https://play.example';
    try {
      await work();
    } finally {
      if (previousUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousUri;
      if (previousDatabase === undefined) delete process.env.MONGODB_DATABASE;
      else process.env.MONGODB_DATABASE = previousDatabase;
      if (previousSecret === undefined) delete process.env.PROXY_SECRET;
      else process.env.PROXY_SECRET = previousSecret;
      if (previousPublicOrigin === undefined) delete process.env.PUBLIC_ORIGIN;
      else process.env.PUBLIC_ORIGIN = previousPublicOrigin;
    }
  }
});
