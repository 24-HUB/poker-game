// Disposable image test entry point. Never imported by the real restore runner.
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { MongoClient, ObjectId } from 'mongodb';
import { restoreManifest } from './restore-account-check.mjs';
import { seedEconomyFixture } from '../support/economy-fixture.mjs';
const require = createRequire(import.meta.url);
const { applyMigrations } = require('../../apps/server/dist/database/migrate.js');
const { createPokerAuth } = require('../../apps/server/dist/modules/identity/auth.js');
let client;
try {
  let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error(); }
  const { uri, database } = JSON.parse(input);
  const target = new URL(uri);
  if (target.hostname !== '127.0.0.1' || target.port !== '27017' || !/^poker_test_restore_[a-f0-9]{32}$/.test(database)) throw new Error();
  client = await new MongoClient(uri).connect(); const db = client.db(database);
  await applyMigrations(db);
  Object.assign(process.env, { NODE_ENV: 'test', PUBLIC_ORIGIN: 'http://127.0.0.1:3100', BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update('disposable-only').digest('hex'), ACCOUNT_EMAIL_TRANSPORT: 'memory', ACCOUNT_RECOVERY_ENFORCED: 'true' });
  const auth = await createPokerAuth(db, client), accounts = [];
  for (const alias of ['A', 'B']) {
    const email = `restore-${alias.toLowerCase()}@fixture.invalid`, password = randomBytes(32).toString('hex');
    const response = await auth.handler(new Request('http://127.0.0.1:3100/api/auth/sign-up/email', { method: 'POST',
      headers: { origin: 'http://127.0.0.1:3100', 'content-type': 'application/json' },
      body: JSON.stringify({ name: `Restore ${alias}`, email, password, registrationCode: 'disposable-only' }) }));
    if (!response.ok) throw new Error();
    const id = (await response.json()).user.id;
    await db.collection('user').updateOne({ _id: new ObjectId(id) }, { $set: { emailVerified: true } });
    const seeded = await seedEconomyFixture(db, client, id, `fixture-${alias}`);
    accounts.push({ alias, email, password, requestIds: [seeded.input.requestId] });
  }
  // This private payload is consumed only by the parent test in memory.
  process.stdout.write(JSON.stringify({ accounts, manifest: await restoreManifest(db) }));
} catch { process.stderr.write('FIXTURE_FAILED\n'); process.exitCode = 1; }
finally { await client?.close(); }
