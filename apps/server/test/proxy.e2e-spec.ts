import request from 'supertest';

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
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
