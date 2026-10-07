import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { applyMigrations } = require('../../apps/server/dist/database/migrate.js');
const { TransactionRunner } = require('../../apps/server/dist/database/transactionRunner.js');
const { TicketsRepository } = require('../../apps/server/dist/modules/tickets/tickets.repository.js');
const { GachaRepository } = require('../../apps/server/dist/modules/gacha/gacha.repository.js');
const { CollectionRepository } = require('../../apps/server/dist/modules/collection/collection.repository.js');
const { CELESTIAL_BANNER, publishCatalogue } = require('../../apps/server/dist/modules/gacha/catalogue.js');

export async function seedDefaultEquipmentFixture(db, client) {
  await applyMigrations(db);
  const collection = new CollectionRepository(db, new TransactionRunner(client));
  await collection.equip('new-account', 'avatar', null, 0);
  return { accountId: 'new-account' };
}

// Synthetic completed hands, real reward/pull/equipment repositories. Never live data.
export async function seedEconomyFixture(db, client, accountId = 'isolated-account') {
  await applyMigrations(db);
  await publishCatalogue(db, CELESTIAL_BANNER);
  const runner = new TransactionRunner(client);
  const tickets = new TicketsRepository(db);
  await tickets.ensureWallet(accountId);
  const completedAt = new Date('2026-10-07T08:00:00.000Z');
  for (let handNumber = 1; handNumber <= 5; handNumber++) {
    const handId = `fixture-hand-${handNumber}`;
    await runner.run(async (session) => {
      const receipts = await tickets.awardHand({
        handId, completedAt, completedDateUtc: '2026-10-07', rewardPolicyVersion: 1,
        participants: [{ accountId }], dealtInAccountIds: [accountId],
        engine: { manualActionAccountIds: [accountId], payouts: { [accountId]: 40 }, contributions: { [accountId]: 20 } },
      }, session);
      await db.collection('hands').insertOne({
        _id: handId, roomId: 'fixture-room', sessionId: 'fixture-session', handNumber,
        status: 'COMPLETED', revision: 1, createdAt: completedAt, completedAt,
        result: { handId, rewardReceipts: receipts },
      }, { session });
    });
  }
  const gacha = new GachaRepository(db, runner, tickets);
  const input = { requestId: randomUUID(), bannerVersion: CELESTIAL_BANNER.version, count: 1 };
  const receipt = await gacha.pull(accountId, input, () => 0);
  const collection = new CollectionRepository(db, runner);
  await collection.equip(accountId, 'avatar', receipt.results[0].itemId, 0);
  return { accountId, input, receipt, gacha, collection };
}
