import { applyMigrations } from '../src/database/migrate';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('immutable catalogue persistence', () => {
  let database: TestDatabase;
  beforeEach(async () => { database = await createTestDatabase(); await applyMigrations(database.db); });
  afterEach(async () => { if (database) await database.dispose(); });
  it('publishes once across retries and rejects edits to a published version', async () => {
    await Promise.all([publishCatalogue(database.db, CELESTIAL_BANNER), publishCatalogue(database.db, CELESTIAL_BANNER)]);
    expect(await database.db.collection('bannerVersions').countDocuments()).toBe(1);
    await expect(publishCatalogue(database.db, { ...CELESTIAL_BANNER, prices: { single: 6, ten: 60 } })).rejects.toThrow('immutable');
    expect((await database.db.collection('bannerVersions').findOne())?.config.prices.single).toBe(5);
  });
  it('creates collection validators and unique account identities idempotently', async () => {
    await applyMigrations(database.db);
    expect(await database.db.collection('schemaMigrations').countDocuments()).toBe(5);
    const progress = database.db.collection('bannerProgress');
    await progress.insertOne({ accountId: 'a', bannerId: 'celestial', sinceSr: 0, sinceSsr: 0 });
    await expect(progress.insertOne({ accountId: 'a', bannerId: 'celestial', sinceSr: 0, sinceSsr: 0 })).rejects.toMatchObject({ code: 11000 });
    await expect(progress.insertOne({ accountId: 'b', bannerId: 'celestial', sinceSr: -1, sinceSsr: 0 })).rejects.toMatchObject({ code: 121 });
    const equipment = database.db.collection('equipment');
    await equipment.insertOne({ accountId: 'a', slot: 'avatar', itemId: null, revision: 0 });
    await expect(equipment.insertOne({ accountId: 'a', slot: 'avatar', itemId: null, revision: 0 })).rejects.toMatchObject({ code: 11000 });
    await expect(equipment.insertOne({ accountId: 'b', slot: 'chips', itemId: null, revision: 0 })).rejects.toMatchObject({ code: 121 });
  });
});
