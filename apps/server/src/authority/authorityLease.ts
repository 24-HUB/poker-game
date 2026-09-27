import type { ClientSession, Db, WithId } from 'mongodb';

export type AuthorityToken = {
  bootId: string;
  epoch: number;
};

type AuthorityLeaseDocument = {
  _id: string;
  ownerBootId: string;
  epoch: number;
  revision: number;
  expiresAt: Date;
};

export class AuthorityLostError extends Error {
  public readonly code = 'AUTHORITY_LOST';

  public constructor() {
    super('Backend authority was lost');
  }
}

export class AuthorityLease {
  private readonly leaseDurationMs: number;
  private ready = false;
  private token: AuthorityToken | null = null;
  private validUntil = 0;

  public constructor(
    private readonly db: Db,
    private readonly bootId: string,
    options: { leaseDurationMs?: number } = {},
  ) {
    this.leaseDurationMs = options.leaseDurationMs ?? 30_000;
  }

  public async acquire(): Promise<AuthorityToken | null> {
    const requestStartedAt = performance.now();
    const canAcquire = {
      $or: [
        { $eq: [{ $type: '$ownerBootId' }, 'missing'] },
        { $eq: ['$ownerBootId', this.bootId] },
        { $lte: ['$expiresAt', '$$NOW'] },
      ],
    };
    const replacement = [
      {
        $set: {
          ownerBootId: { $cond: [canAcquire, this.bootId, '$ownerBootId'] },
          epoch: {
            $cond: [
              canAcquire,
              {
                $cond: [
                  { $eq: ['$ownerBootId', this.bootId] },
                  { $ifNull: ['$epoch', 1] },
                  { $add: [{ $ifNull: ['$epoch', 0] }, 1] },
                ],
              },
              '$epoch',
            ],
          },
          revision: {
            $cond: [canAcquire, { $add: [{ $ifNull: ['$revision', 0] }, 1] }, '$revision'],
          },
          expiresAt: {
            $cond: [
              canAcquire,
              { $dateAdd: { startDate: '$$NOW', unit: 'millisecond', amount: this.leaseDurationMs } },
              '$expiresAt',
            ],
          },
        },
      },
    ];

    let lease: WithId<AuthorityLeaseDocument> | null;
    try {
      lease = await this.db.collection<AuthorityLeaseDocument>('authorityLeases').findOneAndUpdate(
        { _id: 'backend' },
        replacement,
        { upsert: true, returnDocument: 'after' },
      );
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11_000)) throw error;
      lease = await this.db.collection<AuthorityLeaseDocument>('authorityLeases').findOne({ _id: 'backend' });
    }

    if (!lease || lease.ownerBootId !== this.bootId) return null;

    this.token = { bootId: this.bootId, epoch: lease.epoch };
    this.validUntil = requestStartedAt + this.leaseDurationMs;
    return this.token;
  }

  public async renew(token: AuthorityToken): Promise<boolean> {
    const requestStartedAt = performance.now();
    const result = await this.db.collection<AuthorityLeaseDocument>('authorityLeases').updateOne(
      {
        _id: 'backend',
        ownerBootId: token.bootId,
        epoch: token.epoch,
        $expr: { $gt: ['$expiresAt', '$$NOW'] },
      },
      [
        {
          $set: {
            expiresAt: { $dateAdd: { startDate: '$$NOW', unit: 'millisecond', amount: this.leaseDurationMs } },
            revision: { $add: ['$revision', 1] },
          },
        },
      ],
    );

    if (result.matchedCount !== 1) {
      this.markNotReady();
      return false;
    }

    this.validUntil = requestStartedAt + this.leaseDurationMs;
    return true;
  }

  public async fence(session: ClientSession, token: AuthorityToken): Promise<void> {
    const result = await this.db.collection<AuthorityLeaseDocument>('authorityLeases').updateOne(
      {
        _id: 'backend',
        ownerBootId: token.bootId,
        epoch: token.epoch,
        $expr: { $gt: ['$expiresAt', '$$NOW'] },
      },
      { $inc: { revision: 1 } },
      { session },
    );

    if (result.matchedCount !== 1) {
      this.markNotReady();
      throw new AuthorityLostError();
    }
  }

  public async release(token: AuthorityToken): Promise<void> {
    await this.db.collection<AuthorityLeaseDocument>('authorityLeases').updateOne(
      { _id: 'backend', ownerBootId: token.bootId, epoch: token.epoch },
      [{ $set: { expiresAt: '$$NOW', revision: { $add: ['$revision', 1] } } }],
    );
    this.markNotReady();
  }

  public markReady(token: AuthorityToken): void {
    if (this.token?.bootId === token.bootId && this.token.epoch === token.epoch) this.ready = true;
  }

  public markNotReady(): void {
    this.ready = false;
    this.token = null;
    this.validUntil = 0;
  }

  public isReady(): boolean {
    return this.ready && this.token !== null && performance.now() < this.validUntil;
  }
}
