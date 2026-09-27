import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';

import { MONGO_CLIENT, MONGO_DB, TRANSACTION_RUNNER } from './database.tokens';
import { TransactionRunner } from './transactionRunner';

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  public constructor(@Inject(MONGO_CLIENT) private readonly client: MongoClient) {}

  public async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async (): Promise<MongoClient> => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is required');
        const client = new MongoClient(uri, {
          maxPoolSize: 10,
          minPoolSize: 0,
          serverSelectionTimeoutMS: 5_000,
        });
        await client.connect();
        return client;
      },
    },
    {
      provide: MONGO_DB,
      inject: [MONGO_CLIENT],
      useFactory: (client: MongoClient): Db => client.db(process.env.MONGODB_DATABASE ?? 'poker'),
    },
    {
      provide: TRANSACTION_RUNNER,
      inject: [MONGO_CLIENT],
      useFactory: (client: MongoClient): TransactionRunner => new TransactionRunner(client),
    },
    DatabaseLifecycle,
  ],
  exports: [MONGO_CLIENT, MONGO_DB, TRANSACTION_RUNNER],
})
export class DatabaseModule {}
