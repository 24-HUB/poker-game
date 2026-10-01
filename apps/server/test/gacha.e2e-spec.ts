import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { GachaRepository } from '../src/modules/gacha/gacha.repository';
import { TicketsRepository } from '../src/modules/tickets/tickets.repository';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('atomic cosmetic purchases', () => {
  let database: TestDatabase;
  let repository: GachaRepository;
  let runner: TransactionRunner;
  const purchase = (count: 1 | 10 = 1, requestId = randomUUID()) => ({ requestId, bannerVersion: CELESTIAL_BANNER.version, count });
  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    runner = new TransactionRunner(database.client);
    repository = new GachaRepository(database.db, runner, new TicketsRepository(database.db));
    await new TicketsRepository(database.db).ensureWallet('alice');
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: 'alice' }, { $set: { balance: 50 } });
    await database.db.collection('ticketLedger').insertOne({ accountId: 'alice', delta: 50, reason: 'HAND_REWARD', sourceId: 'test-seed', occurredAt: new Date() });
  });
  afterEach(async () => { if (database) await database.dispose(); });
  const wallet = () => database.db.collection<{ _id: string; balance: number }>('ticketWallets').findOne({ _id: 'alice' });
  it('commits one debit and stable receipt for identical concurrent retries', async () => {
    const input = purchase();
    const [first, second] = await Promise.all([repository.pull('alice', input), repository.pull('alice', input)]);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ cost: 5, count: 1 });
    expect((await wallet())?.balance).toBe(45);
    expect(await database.db.collection('pullReceipts').countDocuments()).toBe(1);
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'PULL' })).toBe(1);
    await expect(repository.pull('alice', { ...input, count: 10 })).rejects.toMatchObject({ code: 'COMMAND_CONFLICT' });
    await expect(repository.pull('alice', { ...input, bannerVersion: 'future-v2' })).rejects.toMatchObject({ code: 'COMMAND_CONFLICT' });
  });
  it('charges at most one of two purchases when only five tickets remain', async () => {
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: 'alice' }, { $set: { balance: 5 } });
    const results = await Promise.allSettled([repository.pull('alice', purchase()), repository.pull('alice', purchase())]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await wallet())?.balance).toBe(0);
    expect(await database.db.collection('pullReceipts').countDocuments()).toBe(1);
  });
  it('keeps failed affordability and stale versions free of all purchase effects', async () => {
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: 'alice' }, { $set: { balance: 4 } });
    await expect(repository.pull('alice', purchase())).rejects.toMatchObject({ code: 'INSUFFICIENT_TICKETS' });
    await expect(repository.pull('alice', { ...purchase(), bannerVersion: 'stale' })).rejects.toMatchObject({ code: 'STALE_BANNER' });
    expect((await wallet())?.balance).toBe(4);
    for (const name of ['pullReceipts', 'ownedCosmetics', 'bannerProgress']) expect(await database.db.collection(name).countDocuments()).toBe(0);
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'PULL' })).toBe(0);
  });
  it('keeps request IDs private to the account and permits independent reuse', async () => {
    const input = purchase();
    const receipt = await repository.pull('alice', input);
    expect(await repository.findReceipt('bob', input.requestId)).toBeNull();
    await new TicketsRepository(database.db).ensureWallet('bob');
    await database.db.collection<{ _id: string; balance: number }>('ticketWallets').updateOne({ _id: 'bob' }, { $set: { balance: 5 } });
    expect((await repository.pull('bob', input)).requestId).toBe(receipt.requestId);
    expect(await database.db.collection('pullReceipts').countDocuments()).toBe(2);
  });
  it('processes ten draws in order, updating pity and owned SSR exclusion before each draw', async () => {
    const receipt = await repository.pull('alice', purchase(10), (max) => max === 100 ? 95 : 0);
    expect(receipt.results).toHaveLength(10);
    expect(receipt.results[0]?.duplicate).toBe(false);
    expect(receipt.results[1]?.duplicate).toBe(false);
    expect(receipt.results[1]?.itemId).not.toBe(receipt.results[0]?.itemId);
    expect(receipt.results.slice(2).every((item) => item.duplicate)).toBe(true);
    expect(await database.db.collection('ownedCosmetics').countDocuments()).toBe(2);
    expect(receipt.progress).toEqual({ sinceSr: 0, sinceSsr: 0 });
    expect((await wallet())?.balance).toBe(0);
  });
  it.each(['ticketWallets', 'ownedCosmetics', 'bannerProgress'])('rolls back actual writes at %s and permits the same ID to retry', async (targetName) => {
    let interrupted = false;
    const faultDb = new Proxy(database.db, {
      get(target, property) {
        if (property !== 'collection') { const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value; }
        return (name: string) => new Proxy(target.collection(name), {
          get(collection, method) {
            const value = Reflect.get(collection, method);
            if (name === targetName && ['updateOne', 'insertOne'].includes(String(method))) return async (...args: unknown[]) => {
              const result: unknown = await Reflect.apply(value, collection, args);
              if (!interrupted) { interrupted = true; throw new Error('Injected purchase interruption'); }
              return result;
            };
            return typeof value === 'function' ? value.bind(collection) : value;
          },
        });
      },
    }) as Db;
    const input = purchase();
    const faultRepo = new GachaRepository(faultDb, runner, new TicketsRepository(database.db));
    await expect(faultRepo.pull('alice', input)).rejects.toThrow('Injected purchase interruption');
    expect(interrupted).toBe(true);
    expect((await wallet())?.balance).toBe(50);
    for (const name of ['pullReceipts', 'ownedCosmetics', 'bannerProgress']) expect(await database.db.collection(name).countDocuments()).toBe(0);
    expect(await database.db.collection('ticketLedger').countDocuments({ reason: 'PULL' })).toBe(0);
    expect((await repository.pull('alice', input)).cost).toBe(5);
  });
  it('reconciles a lost commit acknowledgement and returns the original stale-version receipt', async () => {
    const input = purchase();
    const run = runner.run.bind(runner);
    const fault = jest.spyOn(runner, 'run').mockImplementationOnce(async (work) => { await run(work); throw new Error('Lost commit acknowledgement'); });
    const receipt = await repository.pull('alice', input);
    fault.mockRestore();
    await database.db.collection<{ _id: string }>('bannerVersions').deleteOne({ _id: CELESTIAL_BANNER.version });
    expect(await repository.pull('alice', input)).toEqual(receipt);
    expect((await wallet())?.balance).toBe(45);
  });
});
