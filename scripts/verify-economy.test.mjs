import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';
import { MongoClient } from 'mongodb';
import { seedDefaultEquipmentFixture, seedEconomyFixture } from './support/economy-fixture.mjs';

const run = promisify(execFile);
const uri = 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true';

async function fixture(work, seedFixture = seedEconomyFixture) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  const db = client.db(`poker_test_${randomUUID().replaceAll('-', '')}`);
  try {
    const seed = await seedFixture(db, client);
    const { verifyEconomy } = await import('./verify-economy.mjs');
    await work(db, seed, verifyEconomy);
  } finally { await db.dropDatabase(); await client.close(); }
}

test('valid reward → pull → equipment fixture passes without database mutation or private output', async () => {
  await fixture(async (db, seed, verify) => {
    const before = await db.collection('ticketWallets').findOne({ _id: seed.accountId });
    const report = await verify(db);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.counts.rewardReceipts, 5);
    assert.equal(report.counts.pullReceipts, 1);
    assert.deepEqual(await db.collection('ticketWallets').findOne({ _id: seed.accountId }), before);
    const output = JSON.stringify(report);
    for (const secret of [seed.accountId, seed.input.requestId, 'fixture-hand', 'password', 'email']) assert.ok(!output.includes(secret));
  });
});

const corruptions = [
  ['wallet balance differs from ledger', 'walletBalance', async (db) => db.collection('ticketWallets').updateOne({}, { $inc: { balance: 1 } })],
  ['negative wallet', 'walletInvalid', async (db) => db.collection('ticketWallets').updateOne({}, { $set: { balance: -1 } }, { bypassDocumentValidation: true })],
  ['missing wallet', 'walletMissing', async (db) => db.collection('ticketWallets').deleteMany({})],
  ['missing reward ledger', 'rewardLedger', async (db) => db.collection('ticketLedger').deleteOne({ reason: 'HAND_REWARD' })],
  ['missing reward receipt', 'rewardReceipt', async (db) => db.collection('rewardReceipts').deleteOne({})],
  ['aborted rewarded hand', 'rewardHand', async (db) => db.collection('hands').updateOne({}, { $set: { status: 'ABORTED' } })],
  ['embedded reward differs', 'rewardHand', async (db) => db.collection('hands').updateOne({}, { $set: { 'result.rewardReceipts.0.grantedBonus': 0 } })],
  ['missing pull debit', 'pullLedger', async (db) => db.collection('ticketLedger').deleteOne({ reason: 'PULL' })],
  ['missing pull receipt', 'pullReceipt', async (db) => db.collection('pullReceipts').deleteMany({})],
  ['wrong debit', 'pullLedger', async (db) => db.collection('ticketLedger').updateOne({ reason: 'PULL' }, { $set: { delta: -4 } })],
  ['missing ownership', 'ownershipMissing', async (db) => db.collection('ownedCosmetics').deleteMany({})],
  ['invalid owned asset', 'ownershipReference', async (db) => db.collection('ownedCosmetics').updateOne({}, { $set: { itemId: 'missing-asset' } })],
  ['ownership source missing', 'ownershipReference', async (db) => db.collection('ownedCosmetics').updateOne({}, { $set: { requestId: randomUUID() } })],
  ['missing published catalogue', 'catalogueReference', async (db) => db.collection('bannerVersions').deleteMany({})],
  ['changed published catalogue', 'catalogueInvalid', async (db) => db.collection('bannerVersions').updateOne({}, { $set: { 'config.prices.single': 6 } })],
  ['missing progress', 'progressMissing', async (db) => db.collection('bannerProgress').deleteMany({})],
  ['wrong progress', 'progressReference', async (db) => db.collection('bannerProgress').updateOne({}, { $set: { sinceSr: 3 } })],
  ['invalid equipment slot', 'equipmentReference', async (db) => db.collection('equipment').updateOne({}, { $set: { slot: 'cardBack' } })],
  ['missing daily aggregate', 'dailyEarnings', async (db) => db.collection('dailyEarnings').deleteMany({})],
  ['fractional daily aggregate', 'dailyEarnings', async (db) => db.collection('dailyEarnings').updateOne({}, { $set: { earned: 0.5 } }, { bypassDocumentValidation: true })],
  ['missing whole collection', 'collectionMissing', async (db) => db.collection('rewardReceipts').drop()],
  ['malformed pull', 'pullInvalid', async (db) => db.collection('pullReceipts').updateOne({}, { $set: { 'receipt.results': [] } }, { bypassDocumentValidation: true })],
  ['duplicate marker corruption', 'pullHistory', async (db) => db.collection('pullReceipts').updateOne({}, { $set: { 'receipt.results.0.duplicate': true } })],
];
for (const [name, category, corrupt] of corruptions) test(`detects ${name} without repair`, async () => {
  await fixture(async (db, _seed, verify) => {
    await corrupt(db);
    const report = await verify(db);
    assert.equal(report.ok, false);
    assert.ok(report.mismatches[category] > 0, JSON.stringify(report));
  });
});

test('second duplicate purchase and free default equipment remain valid', async () => {
  await fixture(async (db, seed, verify) => {
    const duplicate = await seed.gacha.pull(seed.accountId, { ...seed.input, requestId: randomUUID() }, () => 0);
    assert.equal(duplicate.results[0].duplicate, true);
    await seed.collection.equip(seed.accountId, 'avatar', null, 1);
    assert.equal((await verify(db)).ok, true);
    assert.equal((await db.collection('ticketWallets').findOne({ _id: seed.accountId })).balance, 0);
  });
});

test('new account can select free default equipment before a wallet exists', async () => {
  await fixture(async (db, _seed, verify) => {
    assert.equal(await db.collection('ticketWallets').countDocuments(), 0);
    const report = await verify(db);
    assert.equal(report.ok, true, JSON.stringify(report));
  }, seedDefaultEquipmentFixture);
});

test('one read-only snapshot remains consistent when another client commits a purchase between reads', async () => {
  await fixture(async (db, seed, verify) => {
    let committed = false;
    const wrapped = new Proxy(db, {
      get(target, property) {
        if (property !== 'collection') {
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        }
        return (name) => {
          const collection = target.collection(name);
          if (name !== 'ticketLedger') return collection;
          return new Proxy(collection, {
            get(targetCollection, method) {
              if (method === 'find') return (...args) => ({ toArray: async () => {
                assert.equal(committed, false);
                await seed.gacha.pull(seed.accountId, { ...seed.input, requestId: randomUUID() }, () => 0);
                committed = true;
                return targetCollection.find(...args).toArray();
              } });
              const value = Reflect.get(targetCollection, method);
              return typeof value === 'function' ? value.bind(targetCollection) : value;
            },
          });
        };
      },
    });
    const report = await verify(wrapped);
    assert.equal(committed, true);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.counts.pullReceipts, 1);
    assert.equal(await db.collection('pullReceipts').countDocuments(), 2);
  });
});

test('CLI rejects implicit, nonlocal and unsafe targets before connection and redacts failures', async () => {
  for (const env of [
    { MONGODB_URI: uri },
    { MONGODB_URI: uri, MONGODB_DATABASE: 'production' },
    { MONGODB_URI: 'mongodb+srv://secret:password@example.invalid/', MONGODB_DATABASE: 'poker_test_example' },
    { MONGODB_URI: uri, MONGODB_DATABASE: 'admin', ECONOMY_VERIFY_MODE: 'operator-read-only' },
  ]) {
    await assert.rejects(run(process.execPath, ['scripts/verify-economy.mjs'], {
      env: { ...process.env, ECONOMY_VERIFY_MODE: '', ...env }, timeout: 10000,
    }), (error) => {
      assert.equal(error.code, 1);
      assert.ok(!error.stderr.includes('password') && !error.stderr.includes('example.invalid'));
      return true;
    });
  }
});

test('CLI exits nonzero on corruption and reports only aggregate counts', async () => {
  await fixture(async (db, _seed, _verify) => {
    const env = { ...process.env, MONGODB_URI: uri, MONGODB_DATABASE: db.databaseName, ECONOMY_VERIFY_MODE: '' };
    const passed = await run(process.execPath, ['scripts/verify-economy.mjs'], { env });
    assert.equal(JSON.parse(passed.stdout).ok, true);
    await db.collection('ticketWallets').updateOne({}, { $inc: { balance: 1 } });
    await assert.rejects(run(process.execPath, ['scripts/verify-economy.mjs'], { env }), (error) => {
      assert.equal(JSON.parse(error.stdout).ok, false);
      assert.equal(error.code, 1);
      return true;
    });
  });
});
