import { randomUUID } from 'node:crypto';

import { BeforeApplicationShutdown, Inject, Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import type { Db } from 'mongodb';

import { DatabaseModule } from '../database/database.module';
import { MONGO_DB, TRANSACTION_RUNNER } from '../database/database.tokens';
import { TransactionRunner } from '../database/transactionRunner';
import { AuthorityLease, type AuthorityToken } from './authorityLease';
import { abortPreviousRooms } from './startupCleanup';

const AUTHORITY_BOOT_ID = Symbol('AUTHORITY_BOOT_ID');

@Injectable()
class AuthorityLifecycle implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private token: AuthorityToken | null = null;
  private renewTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private retryDelayMs = 250;
  private stopping = false;

  public constructor(
    private readonly lease: AuthorityLease,
    @Inject(MONGO_DB) private readonly db: Db,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.tryAcquire();
  }

  public async beforeApplicationShutdown(): Promise<void> {
    this.stopping = true;
    if (this.renewTimer) clearTimeout(this.renewTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.lease.markNotReady();
    if (this.token) await this.lease.release(this.token);
    this.token = null;
  }

  private async tryAcquire(): Promise<void> {
    if (this.stopping) return;
    const token = await this.lease.acquire();
    if (!token) {
      this.scheduleRetry();
      return;
    }

    try {
      await this.transactions.run((session) => abortPreviousRooms(this.db, this.lease, session, token));
      this.token = token;
      this.retryDelayMs = 250;
      this.lease.markReady(token);
      this.scheduleRenewal();
    } catch (error) {
      await this.lease.release(token);
      this.scheduleRetry();
      if (error instanceof Error && 'code' in error && error.code === 'AUTHORITY_LOST') return;
      throw error;
    }
  }

  private scheduleRenewal(): void {
    this.renewTimer = setTimeout(() => void this.renew(), 5_000);
    this.renewTimer.unref();
  }

  private async renew(): Promise<void> {
    if (this.stopping || !this.token) return;
    if (await this.lease.renew(this.token)) {
      this.scheduleRenewal();
      return;
    }

    this.token = null;
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (this.stopping || this.retryTimer) return;
    const delay = this.retryDelayMs;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, 2_000);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.tryAcquire();
    }, delay);
    this.retryTimer.unref();
  }
}

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: AUTHORITY_BOOT_ID, useFactory: (): string => randomUUID() },
    {
      provide: AuthorityLease,
      inject: [MONGO_DB, AUTHORITY_BOOT_ID],
      useFactory: (db: Db, bootId: string): AuthorityLease => new AuthorityLease(db, bootId),
    },
    AuthorityLifecycle,
  ],
  exports: [AuthorityLease],
})
export class AuthorityModule {}
