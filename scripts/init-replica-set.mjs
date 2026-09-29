import { MongoClient } from 'mongodb';

const bootstrapUri = process.env.MONGODB_BOOTSTRAP_URI ?? 'mongodb://127.0.0.1:27018/?directConnection=true';
const memberHost = new URL(bootstrapUri).host;
const client = new MongoClient(bootstrapUri, { serverSelectionTimeoutMS: 5_000 });

try {
  await client.connect();
  const admin = client.db('admin');
  try {
    await admin.command({ replSetGetStatus: 1 });
  } catch (error) {
    if (error?.codeName !== 'NotYetInitialized') throw error;
    await admin.command({
      replSetInitiate: {
        _id: 'rs0',
        members: [{ _id: 0, host: memberHost }],
      },
    });
  }
} finally {
  await client.close();
}
