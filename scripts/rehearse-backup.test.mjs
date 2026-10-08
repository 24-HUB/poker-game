import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { MongoClient, ObjectId } from 'mongodb';
import { seedEconomyFixture } from './support/economy-fixture.mjs';
import { verifyEconomy } from './verify-economy.mjs';

const require = createRequire(import.meta.url);
const { createPokerAuth } = require('../apps/server/dist/modules/identity/auth.js');
const { applyMigrations } = require('../apps/server/dist/database/migrate.js');
const { TransactionRunner } = require('../apps/server/dist/database/transactionRunner.js');
const { TicketsRepository } = require('../apps/server/dist/modules/tickets/tickets.repository.js');
const { GachaRepository } = require('../apps/server/dist/modules/gacha/gacha.repository.js');
const { CollectionRepository } = require('../apps/server/dist/modules/collection/collection.repository.js');
const run = promisify(execFile);

// Independent auth-enabled loopback replica set. No URI/environment override is accepted.
test('encrypted quiescent dump restores metadata, sign-in and committed progression with scoped credentials', { timeout: 120000 }, async () => {
  const started = Date.now();
  const port = await unusedPort();
  const container = `poker-restore-${randomUUID()}`;
  const sourceName = `poker_test_source_${randomUUID().replaceAll('-', '')}`;
  const targetName = `poker_test_restore_${randomUUID().replaceAll('-', '')}`;
  const password = randomBytes(32).toString('hex'); // Ephemeral fixture secret only.
  const credentials = new Map([['operator', randomBytes(32).toString('hex')]]);
  const uri = (user, db = 'admin') => `mongodb://${user}:${credentials.get(user)}@127.0.0.1:${port}/?authSource=${db}&replicaSet=rs0&directConnection=true`;
  const connect = async (user, db = 'admin') => {
    const client = new MongoClient(uri(user, db), { serverSelectionTimeoutMS: 2000 });
    await client.connect(); return client;
  };
  const clients = [];
  const temporary = await mkdtemp(join(tmpdir(), 'poker-restore-'));
  const restoreEnvironment = setAuthEnvironment();
  let admin;
  let containerCreated = false;
  try {
    // Docker stores DB/key/tool config only in disposable tmpfs. No external endpoints.
    await run('docker', ['run', '--rm', '-d', '--name', container, '--publish', `127.0.0.1:${port}:${port}`,
      '--tmpfs', '/data/db', '--tmpfs', '/tmp', 'mongo:8.0.17', 'bash', '-c',
      `head -c 756 /dev/urandom | base64 > /tmp/key; chmod 400 /tmp/key; chown mongodb /tmp/key /data/db; exec gosu mongodb mongod --replSet rs0 --keyFile /tmp/key --bind_ip_all --port ${port}`], { timeout: 30000 });
    containerCreated = true;
    await waitUntil(async () => {
      const result = await run('docker', ['exec', container, 'mongosh', '--quiet', '--port', String(port), '--eval', "db.adminCommand('ping').ok"], { timeout: 3000 });
      assert.equal(result.stdout.trim(), '1');
    });
    await mongoScript(container, port, `rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:${port}'}]})`);
    await waitUntil(async () => {
      const result = await run('docker', ['exec', container, 'mongosh', '--quiet', '--port', String(port), '--eval', 'db.hello().isWritablePrimary'], { timeout: 3000 });
      assert.equal(result.stdout.trim(), 'true');
    });
    await mongoScript(container, port, `db.getSiblingDB('admin').createUser({user:'operator',pwd:'${credentials.get('operator')}',roles:['root']})`);
    admin = await connect('operator'); clients.push(admin);
    const roles = [
      ['source-writer', sourceName, 'readWrite'], ['source-reader', sourceName, 'read'],
      ['restore-writer', targetName, 'readWrite'], ['restore-reader', targetName, 'read'],
    ];
    for (const [user, dbName, role] of roles) {
      credentials.set(user, randomBytes(32).toString('hex'));
      await admin.db(dbName).command({ createUser: user, pwd: credentials.get(user), roles: [{ role, db: dbName }] });
    }
    // Schema setup is an operator action; runtime readWrite credentials cannot collMod.
    await applyMigrations(admin.db(sourceName));
    const source = await connect('source-writer', sourceName); clients.push(source);
    const sourceDb = source.db(sourceName);
    const auth = await createPokerAuth(sourceDb, source);
    const request = (path, body) => new Request(`https://fixture.invalid/api/auth/${path}`, {
      method: 'POST', headers: { origin: 'https://fixture.invalid', 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const signup = await auth.handler(request('sign-up/email', { name: 'Restore Tester', email: 'restore@fixture.invalid',
      password, registrationCode: 'fixture-registration' }));
    assert.equal(signup.status, 200);
    const accountId = (await signup.json()).user.id;
    assert.equal((await sourceDb.collection('user').updateOne({ _id: new ObjectId(accountId) }, { $set: { emailVerified: true } })).matchedCount, 1);
    const seed = await seedEconomyFixture(sourceDb, source, accountId);
    assert.equal((await auth.handler(request('sign-in/email', { email: 'restore@fixture.invalid', password }))).status, 200);
    const beforeMetadata = await metadata(sourceDb);
    // All source work awaited; no server, timers, jobs or sessions refreshing in background.
    await source.close();
    await admin.db(sourceName).command({ dropUser: 'source-writer' });
    const reader = await connect('source-reader', sourceName); clients.push(reader);
    await assert.rejects(reader.db(sourceName).collection('ticketWallets').updateOne({}, { $inc: { balance: 1 } }));
    await assert.rejects(reader.db(targetName).collection('ticketWallets').findOne({}));
    const before = await verifyEconomy(reader.db(sourceName));
    assert.equal(before.ok, true, JSON.stringify(before));
    const backupAt = new Date().toISOString();
    const sourceConfig = { uri: `mongodb://source-reader@127.0.0.1:${port}/?authSource=${sourceName}&directConnection=true`, password: credentials.get('source-reader') };
    const targetConfig = { uri: `mongodb://restore-writer@127.0.0.1:${port}/?authSource=${targetName}&directConnection=true`, password: credentials.get('restore-writer') };
    await pipe('docker', ['exec', '-i', container, 'sh', '-c', 'umask 077; cat > /tmp/source.yml'], Buffer.from(JSON.stringify(sourceConfig)));
    await pipe('docker', ['exec', '-i', container, 'sh', '-c', 'umask 077; cat > /tmp/restore.yml'], Buffer.from(JSON.stringify(targetConfig)));
    const dumpVersion = (await run('docker', ['exec', container, 'mongodump', '--version'])).stdout.split('\n')[0].trim();
    const restoreVersion = (await run('docker', ['exec', container, 'mongorestore', '--version'])).stdout.split('\n')[0].trim();
    const dump = await run('docker', ['exec', container, 'mongodump', '--config=/tmp/source.yml', `--db=${sourceName}`, '--archive', '--gzip', '--quiet'],
      { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024, timeout: 30000 });
    // Authenticated encryption, temporary external destination, key retained only in memory.
    const encryptionKey = randomBytes(32), nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, nonce);
    const encrypted = Buffer.concat([cipher.update(dump.stdout), cipher.final()]);
    const archive = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
    const archivePath = join(temporary, 'fixture.archive.gcm');
    await writeFile(archivePath, archive, { mode: 0o600 });
    const checksum = createHash('sha256').update(await readFile(archivePath)).digest('hex');
    const decrypt = (bytes) => {
      const decipher = createDecipheriv('aes-256-gcm', encryptionKey, bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(12, 28));
      return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    };
    const damaged = Buffer.from(archive); damaged[damaged.length - 1] ^= 1;
    assert.throws(() => decrypt(damaged));
    const target = await connect('restore-writer', targetName); clients.push(target);
    assert.equal((await target.db(targetName).listCollections().toArray()).length, 0);
    await assert.rejects(target.db(sourceName).collection('ticketWallets').findOne({}));
    const restoreStarted = Date.now();
    await pipe('docker', ['exec', '-i', container, 'mongorestore', '--config=/tmp/restore.yml', '--archive', '--gzip', '--quiet', '--stopOnError',
      `--nsInclude=${sourceName}.*`, `--nsFrom=${sourceName}.*`, `--nsTo=${targetName}.*`], decrypt(await readFile(archivePath)));
    const restoreMs = Date.now() - restoreStarted;
    const restoredReader = await connect('restore-reader', targetName); clients.push(restoredReader);
    const restoredDb = target.db(targetName);
    assert.deepEqual(await metadata(restoredDb), beforeMetadata);
    assert.deepEqual(await verifyEconomy(restoredReader.db(targetName)), before);
    const restoreAuth = await createPokerAuth(restoredDb, target);
    const signedIn = await restoreAuth.handler(request('sign-in/email', { email: 'restore@fixture.invalid', password }));
    assert.equal(signedIn.status, 200);
    assert.equal((await signedIn.json()).user.id, accountId);
    const runner = new TransactionRunner(target);
    const gacha = new GachaRepository(restoredDb, runner, new TicketsRepository(restoredDb));
    const wallet = await restoredDb.collection('ticketWallets').findOne({ _id: accountId });
    assert.deepEqual(await gacha.pull(accountId, seed.input), seed.receipt);
    assert.deepEqual(await restoredDb.collection('ticketWallets').findOne({ _id: accountId }), wallet);
    const equipped = await new CollectionRepository(restoredDb, runner).equipment(accountId);
    assert.equal(equipped.avatar.itemId, seed.receipt.results[0].itemId);
    assert.equal((await verifyEconomy(restoredReader.db(targetName))).ok, true);
    console.log(JSON.stringify({ rehearsal: 'passed', backupAt, encryptedSha256: checksum, dumpVersion, restoreVersion,
      restoreMs, totalMs: Date.now() - started, fixtureProgressLost: 0, counts: before.counts }));
  } finally {
    restoreEnvironment();
    await Promise.all(clients.map((client) => client.close()));
    // Exact task-created container and temporary directory only; never live namespaces.
    if (containerCreated) await run('docker', ['rm', '-f', container], { timeout: 15000 });
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(temporary.startsWith(join(tmpdir(), 'poker-restore-')));
    await rm(temporary, { recursive: true, force: true });
  }
});

async function metadata(db) {
  const result = {};
  for (const collection of (await db.listCollections().toArray()).sort((a, b) => a.name.localeCompare(b.name))) {
    result[collection.name] = { options: collection.options,
      indexes: (await db.collection(collection.name).listIndexes().toArray()).map(({ v, ...index }) => index).sort((a, b) => a.name.localeCompare(b.name)),
      count: await db.collection(collection.name).countDocuments() };
  }
  return result;
}
async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve)); return port;
}
async function waitUntil(work) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { await work(); return; } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  throw new Error('Isolated authenticated replica set did not become ready');
}
async function mongoScript(container, port, script) {
  await pipe('docker', ['exec', '-i', container, 'mongosh', '--quiet', '--port', String(port)], Buffer.from(script + '\n'));
}
async function pipe(command, args, input) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true });
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Isolated backup tool timed out')); }, 30000);
    child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    child.stdin.on('error', () => {});
    child.on('close', (code) => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error('Isolated backup tool failed')); });
    child.stdin.end(input);
  });
}
function setAuthEnvironment() {
  const values = { NODE_ENV: 'test', PUBLIC_ORIGIN: 'https://fixture.invalid',
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), ACCOUNT_EMAIL_TRANSPORT: 'memory', ACCOUNT_RECOVERY_ENFORCED: 'true',
    REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update('fixture-registration').digest('hex') };
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => { for (const [key, value] of Object.entries(before)) value === undefined ? delete process.env[key] : process.env[key] = value; };
}
