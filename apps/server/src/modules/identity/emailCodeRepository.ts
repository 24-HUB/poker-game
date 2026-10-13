import type { ClientSession, Db, MongoClient } from 'mongodb';
import { TransactionRunner } from '../../database/transactionRunner';
import { EmailCodeError } from './emailCodePolicy';

type RateDocument = { _id: string; attempts: Date[]; cleanupAt: Date };
type StateDocument = { _id: string; revision: number; cleanupAt: Date };

export class EmailCodeRepository {
  private readonly runner: TransactionRunner;
  constructor(public readonly db: Db, client: MongoClient) { this.runner = new TransactionRunner(client); }

  async run<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    // A first-use upsert can race a concurrent first-use insert. Retry the entire
    // aborted transaction; never retry delivery or regenerate a code here.
    for (let attempt = 0; ; attempt++) {
      try { return await this.runner.run(work); }
      catch (error) {
        if (attempt < 7 && error instanceof Error && 'code' in error && error.code === 11000) continue;
        throw error;
      }
    }
  }

  async lock(key: string, now: Date, session: ClientSession): Promise<void> {
    await this.db.collection<StateDocument>('emailCodeStates').updateOne({ _id: key }, {
      $inc: { revision: 1 }, $set: { cleanupAt: new Date(now.getTime() + 7_200_000) },
    }, { upsert: true, session });
  }

  async rate(key: string, now: Date, window: number, maximum: number, session: ClientSession, cooldown = 0): Promise<EmailCodeError | null> {
    const collection = this.db.collection<RateDocument>('emailCodeRateLimits');
    const document = await collection.findOne({ _id: key }, { session });
    const attempts = (document?.attempts ?? []).filter((date) => date.getTime() > now.getTime() - window);
    const last = attempts.at(-1)?.getTime();
    const retryAt = Math.max(attempts.length >= maximum ? attempts[0]!.getTime() + window : 0,
      last !== undefined && now.getTime() < last + cooldown ? last + cooldown : 0);
    if (retryAt > now.getTime()) return new EmailCodeError('RATE_LIMITED', Math.ceil((retryAt - now.getTime()) / 1000));
    await collection.updateOne({ _id: key }, { $set: { attempts: [...attempts, now], cleanupAt: new Date(now.getTime() + window) } }, { upsert: true, session });
    return null;
  }
}
