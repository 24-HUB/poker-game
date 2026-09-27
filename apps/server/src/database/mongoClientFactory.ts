import * as os from 'node:os';

import { MongoClient, type MongoClientOptions } from 'mongodb';

export function createMongoClient(uri: string, options: MongoClientOptions = {}): MongoClient {
  return new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5_000,
    ...options,
    runtimeAdapters: {
      os,
      ...options.runtimeAdapters,
    },
  });
}
