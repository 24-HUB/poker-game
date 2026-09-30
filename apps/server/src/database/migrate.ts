import { Db } from 'mongodb';

import { applyFoundationMigration } from './migrations/001-foundation';
import { applyRoomCommandsMigration } from './migrations/002-room-commands';
import { applyPokerMigration } from './migrations/003-poker';
import { createMongoClient } from './mongoClientFactory';

const migrations = [
  { version: 1, apply: applyFoundationMigration },
  { version: 2, apply: applyRoomCommandsMigration },
  { version: 3, apply: applyPokerMigration },
] as const;

export async function applyMigrations(db: Db): Promise<void> {
  const collection = db.collection<{ _id: number; appliedAt: Date }>('schemaMigrations');

  for (const migration of migrations) {
    const alreadyApplied = await collection.findOne({ _id: migration.version });
    if (alreadyApplied) continue;

    await migration.apply(db);
    try {
      await collection.insertOne({ _id: migration.version, appliedAt: new Date() });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11_000)) throw error;
    }
  }
}

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  const client = createMongoClient(uri);
  try {
    await client.connect();
    await applyMigrations(client.db(process.env.MONGODB_DATABASE ?? 'poker'));
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  void run();
}
