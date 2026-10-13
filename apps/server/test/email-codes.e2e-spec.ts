import { ObjectId, MongoServerError } from 'mongodb';
import { applyMigrations } from '../src/database/migrate';
import { EmailCodeService } from '../src/modules/identity/emailCode.service';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('persistent email codes', () => {
  let database: TestDatabase;
  let clock: number;
  let codes: string[];
  let delivered: Array<{ email: string; purpose: string; code: string }>;
  let userId: ObjectId;
  let fault: string | undefined;
  const email = 'friend@example.com';
  const makeService = () => new EmailCodeService(database.db, database.client, {
    secret: 'test-secret-only-at-least-thirty-two-characters',
    now: () => new Date(clock),
    generateCode: () => codes.shift() ?? '123456',
    hashPassword: async (password) => `hashed:${password}`,
    deliver: async (address, purpose, code) => { delivered.push({ email: address, purpose, code }); },
    afterWrite: async (stage) => { if (stage === fault) throw new Error('Injected failure'); },
  });

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    clock = Date.now();
    codes = ['000042', '000043', '000044', '000045', '000046', '000047'];
    delivered = []; fault = undefined; userId = new ObjectId();
    await database.db.collection('user').insertOne({ _id: userId, email, emailVerified: false, name: 'Friend' });
    await database.db.collection('account').insertOne({ userId, providerId: 'credential', password: 'old-hash' });
    await database.db.collection('session').insertOne({ userId, token: 'test-only-session' });
  });
  afterEach(async () => { if (database) await database.dispose(); });

  it('verifies once with leading zeroes and no plaintext persisted', async () => {
    const service = makeService();
    await service.issue(email, 'email-verification', 'ip-a');
    const docs = await database.db.collection('emailCodeChallenges').find().toArray();
    expect(JSON.stringify(docs)).not.toContain('000042');
    await expect(service.verify(email, '000042', 'ip-a')).resolves.toEqual({ status: true });
    expect((await database.db.collection('user').findOne({ _id: userId }))?.emailVerified).toBe(true);
    await expect(service.verify(email, '000042', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    expect(await database.db.collection('session').countDocuments()).toBe(1);
  });

  it('commits the fifth failure and refuses a correct sixth across restart', async () => {
    await makeService().issue(email, 'email-verification', 'ip-a');
    for (let i = 0; i < 5; i++) await expect(makeService().verify(email, '999999', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    expect((await database.db.collection('emailCodeChallenges').findOne({ purpose: 'email-verification' }))?.failures).toBe(5);
    await expect(makeService().verify(email, '000042', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
  });

  it('enforces exact expiry, scope and normalized cooldown', async () => {
    const service = makeService();
    await service.issue(email, 'email-verification', 'ip-a');
    await expect(service.issue('FRIEND@example.com', 'email-verification', 'ip-b')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 60 });
    await expect(service.reset(email, '000042', 'new-password', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await expect(service.verify('other@example.com', '000042', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    clock += 600_000;
    await expect(service.verify(email, '000042', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
  });

  it('serializes resends, rejects old code and avoids same-purpose and cross-purpose collisions', async () => {
    const service = makeService();
    await service.issue(email, 'email-verification', 'ip-a');
    codes.unshift('000042');
    await service.issue(email, 'password-reset', 'ip-a');
    expect(delivered[1]?.code).toBe('000043');
    clock += 60_000; codes.unshift('000042', '000043');
    const results = await Promise.allSettled([service.issue(email, 'email-verification', 'ip-a'), service.issue(email, 'email-verification', 'ip-b')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(delivered).toHaveLength(3);
    await expect(service.verify(email, '000042', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await service.verify(email, delivered[2]!.code, 'ip-a');
  });

  it('counts concurrent wrong attempts without losing or rolling back failures', async () => {
    const service = makeService();
    await service.issue(email, 'email-verification', 'ip-a');
    await Promise.allSettled(Array.from({ length: 5 }, (_, i) => service.verify(email, '999999', `ip-${i}`)));
    expect((await database.db.collection('emailCodeChallenges').findOne({ purpose: 'email-verification' }))?.failures).toBe(5);
  });

  it('resets once atomically, verifies email, revokes sessions and invalidates both purposes', async () => {
    const service = makeService();
    await service.issue(email, 'email-verification', 'ip-a');
    await service.issue(email, 'password-reset', 'ip-a');
    const results = await Promise.allSettled([service.reset(email, '000043', 'winner-one', 'ip-a'), service.reset(email, '000043', 'winner-two', 'ip-b')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const winner = results[0]!.status === 'fulfilled' ? 'winner-one' : 'winner-two';
    expect((await database.db.collection('account').findOne({ userId }))?.password).toBe(`hashed:${winner}`);
    expect((await database.db.collection('user').findOne({ _id: userId }))?.emailVerified).toBe(true);
    expect(await database.db.collection('session').countDocuments({ userId })).toBe(0);
    await expect(service.verify(email, '000042', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
  });

  it.each(['consume', 'password', 'verify', 'sessions'])('rolls back a fault after %s and preserves a recoverable code', async (stage) => {
    const service = makeService();
    await service.issue(email, 'password-reset', 'ip-a');
    fault = stage;
    await expect(service.reset(email, '000042', 'new-password', 'ip-a')).rejects.toThrow();
    expect((await database.db.collection('account').findOne({ userId }))?.password).toBe('old-hash');
    expect((await database.db.collection('user').findOne({ _id: userId }))?.emailVerified).toBe(false);
    expect(await database.db.collection('session').countDocuments({ userId })).toBe(1);
    fault = undefined;
    await service.reset(email, '000042', 'new-password', 'ip-a');
  });

  it('validates password before consumption or failure count', async () => {
    const service = makeService(); await service.issue(email, 'password-reset', 'ip-a');
    await expect(service.reset(email, '000042', 'short', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
    expect((await database.db.collection('emailCodeChallenges').findOne({ purpose: 'password-reset' }))?.failures).toBe(0);
    await service.reset(email, '000042', 'new-password', 'ip-a');
  });

  it('applies hourly address limits to unknown addresses too', async () => {
    const service = makeService();
    for (let i = 0; i < 5; i++) { await service.issue('unknown@example.com', 'password-reset', 'ip-a'); clock += 60_000; }
    await expect(service.issue('UNKNOWN@example.com', 'password-reset', 'ip-b')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 3300 });
    expect(delivered).toHaveLength(0);
    expect(await database.db.collection('user').countDocuments()).toBe(1);
    clock += 3_300_000; await service.issue('unknown@example.com', 'password-reset', 'ip-a');
  });

  it('applies send and confirmation IP limits to unknown accounts', async () => {
    const service = makeService();
    for (let i = 0; i < 20; i++) await service.issue(`unknown${i}@example.com`, 'password-reset', 'ip-a');
    await expect(service.issue('extra@example.com', 'password-reset', 'ip-a')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 3600 });
    for (let i = 0; i < 30; i++) await expect(service.verify(email, '999999', 'ip-b')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await expect(service.verify(email, '999999', 'ip-b')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 600 });
  });

  it('migration is idempotent and preserves existing provider records', async () => {
    await applyMigrations(database.db); await applyMigrations(database.db);
    expect(await database.db.collection<{ _id: number }>('schemaMigrations').countDocuments({ _id: 6 })).toBe(1);
    expect((await database.db.collection('user').findOne({ _id: userId }))?.email).toBe(email);
  });
  it('rejects malformed and IP-limited reset attempts before expensive password hashing', async () => {
    const hash = jest.fn(async (password: string) => `hashed:${password}`);
    const service = new EmailCodeService(database.db, database.client, { secret: 'test-secret', now: () => new Date(clock), hashPassword: hash, deliver: async () => {} });
    await expect(service.reset(email, 'malformed', 'valid-password', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    expect(hash).not.toHaveBeenCalled();
    for (let i = 0; i < 29; i++) await expect(service.verify(email, '999999', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await expect(service.reset(email, '000042', 'valid-password', 'ip-a')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(hash).not.toHaveBeenCalled();
  });
  it('holds known and unknown responses to the same delivery window during an outage', async () => {
    let releaseDelivery!: () => void; let deliveryStarted!: () => void; let releaseWindow!: () => void;
    const started = new Promise<void>((resolve) => { deliveryStarted = resolve; });
    const window = new Promise<void>((resolve) => { releaseWindow = resolve; });
    const wait = jest.fn(async () => window);
    const service = new EmailCodeService(database.db, database.client, { secret: 'test-secret', hashPassword: async () => 'hash',
      deliveryWindowMs: 5000, wait,
      deliver: async () => { deliveryStarted(); await new Promise<void>((resolve) => { releaseDelivery = resolve; }); throw new Error('Timeout'); },
    });
    let unknownDone = false; const known = service.issue(email, 'password-reset', 'ip-a');
    const unknown = service.issue('unknown@example.com', 'password-reset', 'ip-b').then((result) => { unknownDone = true; return result; });
    await started;
    // Let the independent unknown transaction reach its response boundary.
    await new Promise((resolve) => setTimeout(resolve, 100));
    try { expect(unknownDone).toBe(false); expect(wait).toHaveBeenCalledTimes(2); }
    finally { releaseDelivery(); releaseWindow(); await Promise.all([known, unknown]); }
  });
  it('serializes resend against confirmation and does not resurrect the old generation', async () => {
    const service = makeService(); await service.issue(email, 'password-reset', 'ip-a'); clock += 60_000;
    const results = await Promise.allSettled([service.reset(email, '000042', 'new-password', 'ip-a'), service.issue(email, 'password-reset', 'ip-b')]);
    expect(results[1]!.status).toBe('fulfilled');
    await expect(service.reset(email, '000042', 'another-password', 'ip-a')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await service.reset(email, delivered.at(-1)!.code, 'final-password', 'ip-a');
    expect((await database.db.collection('account').findOne({ userId }))?.password).toBe('hashed:final-password');
  });
  it('a wrong submit racing resend cannot damage or resurrect the new challenge', async () => {
    const service = makeService(); await service.issue(email, 'email-verification', 'ip-a'); clock += 60_000;
    await Promise.allSettled([service.verify(email, '999999', 'ip-a'), service.issue(email, 'email-verification', 'ip-b')]);
    const latest = await database.db.collection('emailCodeChallenges').findOne({ purpose: 'email-verification' });
    expect(latest?.failures).toBeLessThanOrEqual(1); expect(latest?.status).toBe('active');
    await service.verify(email, delivered.at(-1)!.code, 'ip-a');
  });
  it.each(['issue-first', 'reset-first'])('serializes reset against verification issuance (%s)', async (order) => {
    const service = makeService(); await service.issue(email, 'password-reset', 'ip-a');
    if (order === 'issue-first') {
      await service.issue(email, 'email-verification', 'ip-b'); await service.reset(email, '000042', 'new-password', 'ip-a');
      await expect(service.verify(email, '000043', 'ip-b')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    } else {
      await service.reset(email, '000042', 'new-password', 'ip-a'); await service.issue(email, 'email-verification', 'ip-b');
      expect(delivered).toHaveLength(1);
    }
    expect((await database.db.collection('user').findOne({ _id: userId }))?.emailVerified).toBe(true);
  });
  it('does not regenerate or deliver twice when Mongo retries issuance', async () => {
    const collection = database.db.collection('emailCodeChallenges'); const original = collection.replaceOne.bind(collection);
    const replace = jest.spyOn(collection, 'replaceOne').mockImplementationOnce(async (...args) => {
      await original(...args); const error = new MongoServerError({ message: 'Injected write conflict', code: 112 });
      error.addErrorLabel('TransientTransactionError'); throw error;
    });
    const getCollection = database.db.collection.bind(database.db);
    const factory = jest.spyOn(database.db, 'collection').mockImplementation((name, options) => name === 'emailCodeChallenges' ? collection : getCollection(name, options));
    try {
      await makeService().issue(email, 'password-reset', 'ip-a');
      expect(replace).toHaveBeenCalledTimes(2); expect(delivered).toHaveLength(1); expect(codes).toHaveLength(5);
      expect(await collection.countDocuments()).toBe(1);
    } finally { factory.mockRestore(); replace.mockRestore(); }
  });
});
