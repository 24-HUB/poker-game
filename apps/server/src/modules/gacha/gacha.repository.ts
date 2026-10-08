import { createHash, randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { BannerProgress, BannerVersion, PullReceipt, PullRequest } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { ClientSession, Db } from 'mongodb';
import { ReleaseControls } from '../../config/release-controls';
import { MONGO_DB, TRANSACTION_RUNNER } from '../../database/database.tokens';
import { TransactionRunner } from '../../database/transactionRunner';
import { TicketsRepository, type WalletDocument } from '../tickets/tickets.repository';
import { CELESTIAL_BANNER, type BannerDocument } from './catalogue';
import { drawOne } from './drawPolicy';

export type OwnedCosmetic = { accountId: string; itemId: string; bannerVersion: string; requestId: string; acquiredAt: Date };
type ProgressDocument = BannerProgress & { accountId: string; bannerId: string };
type ReceiptDocument = { accountId: string; requestId: string; payloadHash: string; receipt: PullReceipt };
export class GachaError extends Error {
  public constructor(public readonly code: string, message: string) { super(message); }
}
function payloadHash(input: PullRequest): string {
  return createHash('sha256').update(JSON.stringify([input.bannerVersion, input.count])).digest('hex');
}

@Injectable()
export class GachaRepository {
  public constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    private readonly tickets: TicketsRepository,
    private readonly controls: ReleaseControls = new ReleaseControls(),
  ) {}

  public async banner(version = CELESTIAL_BANNER.version, session?: ClientSession): Promise<BannerVersion> {
    const document = await this.db.collection<BannerDocument>('bannerVersions').findOne({ _id: version }, { session });
    if (!document) throw new GachaError('SERVICE_UNAVAILABLE', 'The catalogue is not available yet.');
    const { bannerVersionSchema } = await import('@poker/contracts');
    return bannerVersionSchema.parse(document.config);
  }

  public async findReceipt(accountId: string, requestId: string): Promise<PullReceipt | null> {
    return (await this.db.collection<ReceiptDocument>('pullReceipts').findOne(
      { accountId, requestId }, { readConcern: { level: 'majority' } },
    ))?.receipt ?? null;
  }

  private matching(document: ReceiptDocument, input: PullRequest): PullReceipt {
    if (document.payloadHash !== payloadHash(input)) throw new GachaError('COMMAND_CONFLICT', 'This request ID was already used for another purchase.');
    return document.receipt;
  }

  public async pull(accountId: string, input: PullRequest, random: (max: number) => number = randomInt): Promise<PullReceipt> {
    // Resolve committed retries before the gate, catalogue reads or lazy wallet initialization.
    const prior = await this.db.collection<ReceiptDocument>('pullReceipts').findOne(
      { accountId, requestId: input.requestId }, { readConcern: { level: 'majority' } },
    );
    if (prior) return this.matching(prior, input);
    if (!this.controls.settings.economyWritesEnabled) {
      throw new GachaError('MAINTENANCE', 'New purchases are paused for maintenance.');
    }
    await this.tickets.ensureWallet(accountId);
    try {
      return await this.transactions.run(async (session) => {
        const receipts = this.db.collection<ReceiptDocument>('pullReceipts');
        const prior = await receipts.findOne({ accountId, requestId: input.requestId }, { session });
        if (prior) return this.matching(prior, input);
        const wallets = this.db.collection<WalletDocument>('ticketWallets');
        const wallet = await wallets.findOneAndUpdate({ _id: accountId },
          { $inc: { revision: 1 }, $set: { updatedAt: new Date() } }, { session, returnDocument: 'after' });
        if (!wallet) throw new Error('Ticket wallet is missing');
        if (input.bannerVersion !== CELESTIAL_BANNER.version) throw new GachaError('STALE_BANNER', 'The catalogue changed. Review the current prices before pulling.');
        const config = await this.banner(input.bannerVersion, session);
        const cost = input.count === 1 ? config.prices.single : config.prices.ten;
        const debit = await wallets.updateOne({ _id: accountId, revision: wallet.revision, balance: { $gte: cost } },
          { $inc: { balance: -cost } }, { session });
        if (debit.matchedCount !== 1) throw new GachaError('INSUFFICIENT_TICKETS', 'Earn more tickets at the poker table before pulling.');
        const progressCollection = this.db.collection<ProgressDocument>('bannerProgress');
        const saved = await progressCollection.findOne({ accountId, bannerId: config.id }, { session });
        let progress: BannerProgress = saved ? { sinceSr: saved.sinceSr, sinceSsr: saved.sinceSsr } : { sinceSr: 0, sinceSsr: 0 };
        const ownership = this.db.collection<OwnedCosmetic>('ownedCosmetics');
        const owned = new Set((await ownership.find({ accountId }, { session }).toArray()).map((item) => item.itemId));
        const results: PullReceipt['results'] = [];
        const now = new Date();
        for (let i = 0; i < input.count; i += 1) {
          const result = drawOne(config, progress, owned, random);
          results.push(result);
          progress = result.progress;
          if (!result.duplicate) {
            await ownership.insertOne({ accountId, itemId: result.itemId, bannerVersion: config.version,
              requestId: input.requestId, acquiredAt: now }, { session });
            owned.add(result.itemId);
          }
        }
        await progressCollection.updateOne({ accountId, bannerId: config.id },
          { $set: progress, $setOnInsert: { accountId, bannerId: config.id } }, { session, upsert: true });
        await this.db.collection('ticketLedger').insertOne({ accountId, delta: -cost, reason: 'PULL', sourceId: input.requestId, occurredAt: now }, { session });
        const receipt: PullReceipt = { ...input, cost, results, progress, committedAt: now.toISOString(), walletRevision: wallet.revision };
        await receipts.insertOne({ accountId, requestId: input.requestId, payloadHash: payloadHash(input), receipt }, { session });
        return receipt;
      });
    } catch (error) {
      // Resolve an acknowledged-late commit without replacing its request identity or result.
      const committed = await this.db.collection<ReceiptDocument>('pullReceipts').findOne(
        { accountId, requestId: input.requestId }, { readConcern: { level: 'majority' } },
      );
      if (committed) return this.matching(committed, input);
      throw error;
    }
  }
}
