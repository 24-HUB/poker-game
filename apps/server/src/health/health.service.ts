import { Inject, Injectable } from '@nestjs/common';
import type { Db } from 'mongodb';

import { AuthorityLease } from '../authority/authorityLease';
import { MONGO_DB } from '../database/database.tokens';

@Injectable()
export class HealthService {
  public constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly authority: AuthorityLease,
  ) {}

  public async checkDeployment(): Promise<void> {
    await this.db.command({ ping: 1 });
    const migration = await this.db.collection<{ _id: number }>('schemaMigrations').findOne({ _id: 1 });
    if (!migration) throw new Error('Database schema is not ready');
  }

  public async isReady(): Promise<boolean> {
    try {
      await this.checkDeployment();
      return this.authority.isReady();
    } catch {
      return false;
    }
  }
}
