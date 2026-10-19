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
export async function seedEconomyFixture(db, client, accountId = 'isolated-account', prefix = 'fixture') {
  await applyMigrations(db);
  await publishCatalogue(db, CELESTIAL_BANNER);
  const runner = new TransactionRunner(client);
  const tickets = new TicketsRepository(db);
  await tickets.ensureWallet(accountId);
  const opponent = 'zz-fixture-opponent';
  await tickets.ensureWallet(opponent);
  const completedAt = new Date('2026-10-07T08:00:00.000Z');
  const participants = [{ accountId, displayName: 'Fixture player', seat: 0, kind: 'human' },
    { accountId: opponent, displayName: 'Fixture opponent', seat: 1, kind: 'human' }];
  await db.collection('gameSessions').insertOne({ _id: `${prefix}-session`, roomId: `${prefix}-room`, status: 'COMPLETED', mode: 'standard',
    startedByAccountId: accountId, startCommandId: 'fixture-start', startPayloadHash: 'a'.repeat(64), authorityBootId: 'fixture-boot', authorityEpoch: 1,
    participants, stacks: [1100, 900], firstHandId: `${prefix}-hand-1`, handNumber: 5, buttonSeat: 0, startedAt: completedAt, endingRequested: false });
  for (let handNumber = 1; handNumber <= 5; handNumber++) {
    const handId = `${prefix}-hand-${handNumber}`;
    await runner.run(async (session) => {
      const receipts = await tickets.awardHand({
        handId, roomId: `${prefix}-room`, sessionId: `${prefix}-session`, mode: 'standard', completedAt, completedDateUtc: '2026-10-07', rewardPolicyVersion: 1,
        participants, dealtInAccountIds: [accountId, opponent],
        engine: { manualActionAccountIds: [accountId], payouts: { [accountId]: 40 }, contributions: { [accountId]: 20 } },
      }, session);
      await db.collection('hands').insertOne({
        _id: handId, roomId: `${prefix}-room`, sessionId: `${prefix}-session`, handNumber,
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
