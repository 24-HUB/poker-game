import request from 'supertest';

import { applyMigrations } from '../src/database/migrate';
import { createApplication } from '../src/main';
import { createTestDatabase } from './support/testDatabase';

describe('application bootstrap', () => {
  it('bootsRealNestModule', async () => {
    const database = await createTestDatabase();
    await applyMigrations(database.db);
    const previousUri = process.env.MONGODB_URI;
    const previousDatabase = process.env.MONGODB_DATABASE;
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';
    process.env.MONGODB_DATABASE = database.db.databaseName;
    const application = await createApplication();
    await application.init();

    try {
      const response = await request(application.getHttpServer()).get('/health/live');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    } finally {
      await application.close();
      await database.dispose();
      if (previousUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousUri;
      if (previousDatabase === undefined) delete process.env.MONGODB_DATABASE;
      else process.env.MONGODB_DATABASE = previousDatabase;
    }
  });
});
