import { randomUUID } from 'node:crypto';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { CollectionRepository, snapshotEquipment } from '../src/modules/collection/collection.repository';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('owned equipment', () => {
  let database: TestDatabase;
  let repository: CollectionRepository;
  let runner: TransactionRunner;
  const avatar = CELESTIAL_BANNER.items.find((item) => item.slot === 'avatar')!;
  const back = CELESTIAL_BANNER.items.find((item) => item.slot === 'cardBack')!;
  beforeEach(async () => {
    database = await createTestDatabase(); await applyMigrations(database.db);
    await publishCatalogue(database.db, CELESTIAL_BANNER);
    runner = new TransactionRunner(database.client);
    repository = new CollectionRepository(database.db, runner);
    for (const item of [avatar, back]) await database.db.collection('ownedCosmetics').insertOne({
      accountId: 'alice', itemId: item.id, bannerVersion: CELESTIAL_BANNER.version, requestId: randomUUID(), acquiredAt: new Date(),
    });
  });
  afterEach(async () => { if (database) await database.dispose(); });
  it('starts with free defaults and restricts ownership and slots', async () => {
    expect(await repository.equipment('bob')).toEqual({ avatar: { itemId: null, revision: 0 }, cardBack: { itemId: null, revision: 0 } });
    await expect(repository.equip('bob', 'avatar', avatar.id, 0)).rejects.toMatchObject({ code: 'NOT_OWNED' });
    await expect(repository.equip('alice', 'avatar', back.id, 0)).rejects.toMatchObject({ code: 'INVALID_SLOT' });
    expect((await repository.collection('bob')).items).toHaveLength(0);
    expect((await repository.collection('alice')).items).toHaveLength(2);
  });
  it('requires the latest per-slot revision and permits switching to the free default', async () => {
    expect((await repository.equip('alice', 'avatar', avatar.id, 0)).avatar).toEqual({ itemId: avatar.id, revision: 1 });
    await expect(repository.equip('alice', 'avatar', null, 0)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect((await repository.equip('alice', 'avatar', null, 1)).avatar).toEqual({ itemId: null, revision: 2 });
    expect((await repository.equipment('alice')).cardBack.revision).toBe(0);
  });
  it('accepts one concurrent first-slot change and rejects the stale tab', async () => {
    const results = await Promise.allSettled([repository.equip('alice', 'avatar', avatar.id, 0), repository.equip('alice', 'avatar', null, 0)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason.code).toBe('REVISION_CONFLICT');
  });
  it('reads inventory and selected equipment from one snapshot during a competing change', async () => {
    const readEquipment = repository.equipment.bind(repository);
    jest.spyOn(repository, 'equipment').mockImplementationOnce(async (accountId, session) => {
      await repository.equip('alice', 'avatar', avatar.id, 0);
      return readEquipment(accountId, session);
    });
    const before = await repository.collection('alice');
    expect(before.equipment.avatar).toEqual({ itemId: null, revision: 0 });
    expect((await repository.collection('alice')).equipment.avatar).toEqual({ itemId: avatar.id, revision: 1 });
  });
  it('captures complete artwork in one snapshot and keeps a captured selection after a later change', async () => {
    await repository.equip('alice', 'avatar', avatar.id, 0);
    await repository.equip('alice', 'cardBack', back.id, 0);
    const frozen = await runner.run((session) => snapshotEquipment(database.db, ['alice', 'bob'], session));
    await repository.equip('alice', 'avatar', null, 1);
    expect(frozen.alice).toEqual({ avatar, cardBack: back });
    expect(frozen.bob).toEqual({ avatar: null, cardBack: null });
    const next = await runner.run((session) => snapshotEquipment(database.db, ['alice'], session));
    expect(next.alice?.avatar).toBeNull();
  });
  it('freezes one committed selection when equipping races the deal snapshot', async () => {
    await repository.equip('alice', 'avatar', avatar.id, 0);
    const [dealt] = await Promise.all([
      runner.run((session) => snapshotEquipment(database.db, ['alice', 'bob'], session)),
      repository.equip('alice', 'avatar', null, 1),
    ]);
    expect([null, avatar]).toContainEqual(dealt.alice?.avatar);
    expect(dealt.bob).toEqual({ avatar: null, cardBack: null });
    const frozen = structuredClone(dealt);
    await repository.equip('alice', 'cardBack', back.id, 0);
    expect(dealt).toEqual(frozen);
    expect((await repository.equipment('alice')).avatar.itemId).toBeNull();
  });
});
