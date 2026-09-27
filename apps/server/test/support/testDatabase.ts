import { randomUUID } from 'node:crypto';

import { Db, MongoClient } from 'mongodb';

export type TestDatabase = {
  client: MongoClient;
  db: Db;
  dispose: () => Promise<void>;
};

export async function createTestDatabase(uri = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true'): Promise<TestDatabase> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  try {
    await client.connect();
  } catch (error) {
    await client.close();
    throw error;
  }
  const db = client.db(`poker_test_${randomUUID().replaceAll('-', '')}`);

  return {
    client,
    db,
    dispose: async () => {
      await db.dropDatabase();
      await client.close();
    },
  };
}
