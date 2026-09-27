import type { ClientSession, MongoClient, TransactionOptions } from 'mongodb';

const transactionOptions: TransactionOptions = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
  maxCommitTimeMS: 5_000,
};

export class TransactionRunner {
  public constructor(private readonly client: MongoClient) {}

  public async run<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const hello = await this.client.db('admin').command({ hello: 1 }) as { setName?: string };
    if (!hello.setName) {
      throw new Error('MongoDB replica set transactions are required');
    }

    const session = this.client.startSession();
    try {
      return await session.withTransaction(work, transactionOptions) as T;
    } finally {
      await session.endSession();
    }
  }
}
