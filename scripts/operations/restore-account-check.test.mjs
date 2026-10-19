import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
test('rejects non-loopback and non-restore database targets before opening a browser', async () => {
  const { checkRestoredAccounts } = await import('./restore-account-check.mjs');
  for (const input of [{ origin: 'https://source.invalid', database: 'poker_playtest' },
    { origin: 'http://127.0.0.1:3100', database: 'poker_playtest' }]) {
    const report = await checkRestoredAccounts(input);
    assert.equal(report.ok, false);
    assert.deepEqual(report.violations, ['ISOLATION_FAILED']);
    assert.ok(!JSON.stringify(report).includes('source.invalid'));
  }
});
test('restored real auth and receipt replay preserve progression with egress denied; missing purchases cannot pass', { timeout: 240000 }, async () => {
  const { startIsolatedRunner, privateProcess } = await import('./restore-host.mjs');
  const { inspectRestoreIsolation, verifyRestoreIsolation } = await import('./restore-isolation.mjs');
  const candidate = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const isolated = await startIsolatedRunner(candidate);
  try {
    assert.equal(verifyRestoreIsolation(await inspectRestoreIsolation(isolated.mongo, isolated.runner)).ok, true);
    const generated = JSON.parse((await privateProcess('docker', ['exec', '-i', isolated.runner, 'node', 'scripts/operations/restore-fixture.mjs'],
      JSON.stringify({ uri: isolated.uri, database: isolated.database }))).toString());
    const dump = await privateProcess('docker', ['exec', isolated.mongo, 'mongodump', '--config=/tmp/restore.yml', `--db=${isolated.database}`, '--archive', '--gzip', '--quiet']);
    // Generated encryption material only; no environment/archive override exists.
    const key = randomBytes(32), nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
    const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
    const decrypt = createDecipheriv('aes-256-gcm', key, nonce); decrypt.setAuthTag(cipher.getAuthTag());
    const plaintext = Buffer.concat([decrypt.update(encrypted), decrypt.final()]);
    const target = `poker_test_restore_${randomUUID().replaceAll('-', '')}`;
    await privateProcess('docker', ['exec', '-i', isolated.mongo, 'mongorestore', '--config=/tmp/restore.yml', '--archive', '--gzip', '--quiet', '--stopOnError',
      `--nsInclude=${isolated.database}.*`, `--nsFrom=${isolated.database}.*`, `--nsTo=${target}.*`], plaintext);
    const input = { uri: isolated.uri, database: target, ...generated };
    const result = JSON.parse((await privateProcess('docker', ['exec', '-i', isolated.runner, 'node', 'scripts/operations/run-restored-app.mjs'], JSON.stringify(input), 180000)).toString());
    assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.accounts.length, 2);
    for (const row of result.accounts) assert.deepEqual(row, { alias: row.alias, signedIn: true, receiptReplayUnchanged: true, progressionUnchanged: true });
    // The checker must refuse content predating B's purchase, without touching source.
    const badInput = { ...input, accounts: generated.accounts.map((account) => ({ ...account, requestIds: [randomUUID()] })) };
    // Re-running the app changes the local lease/session manifest, so obtain a fresh
    // private pre-app manifest solely for this negative fixture check.
    const source = `import {MongoClient} from 'mongodb';import {restoreManifest} from './scripts/operations/restore-account-check.mjs';let t='';for await(const c of process.stdin)t+=c;const i=JSON.parse(t);const c=await new MongoClient(i.uri).connect();process.stdout.write(JSON.stringify(await restoreManifest(c.db(i.database))));await c.close();`;
    badInput.manifest = JSON.parse((await privateProcess('docker', ['exec', '-i', isolated.runner, 'node', '--input-type=module', '-e', source], JSON.stringify({ uri: isolated.uri, database: target }))).toString());
    await assert.rejects(privateProcess('docker', ['exec', '-i', isolated.runner, 'node', 'scripts/operations/run-restored-app.mjs'], JSON.stringify(badInput), 180000), /ISOLATION_FAILED/);
  } finally { await isolated.cleanup(); }
});
test('actual network-none containment rejects host mounts, source secrets and default routes', { timeout: 60000 }, async () => {
  const { inspectRestoreIsolation, verifyRestoreIsolation } = await import('./restore-isolation.mjs');
  const name = `poker-isolation-${randomUUID()}`;
  try {
    await run('docker', ['run', '--rm', '-d', '--name', name, '--network', 'none', '--tmpfs', '/data/db', '--tmpfs', '/data/configdb', '--tmpfs', '/tmp',
      'mongo:8.0.17', 'sleep', '300']);
    const inspection = await inspectRestoreIsolation(name);
    assert.deepEqual(verifyRestoreIsolation(inspection), { ok: true, violations: [] });
    assert.equal(verifyRestoreIsolation({ ...inspection, probes: { ...inspection.probes, defaultRoute: true } }).ok, false);
    for (const [field, value, expected] of [
      ['Mounts', [{ Type: 'bind', Destination: '/data/db', Source: '/source' }], 'HOST_MOUNT'],
      ['Config', { Env: ['MONGODB_URI=mongodb+srv://synthetic-secret@source.invalid'] }, 'SOURCE_CONFIG'],
      ['HostConfig', { ...inspection.mongo.HostConfig, NetworkMode: 'host' }, 'NETWORK_MODE'],
      ['HostConfig', { ...inspection.mongo.HostConfig, PortBindings: { '27017/tcp': [{ HostPort: '27017' }] } }, 'PUBLISHED_PORT'],
    ]) {
      const result = verifyRestoreIsolation({ ...inspection, mongo: { ...inspection.mongo, [field]: value } });
      assert.ok(result.violations.includes(expected));
      assert.ok(!JSON.stringify(result).includes('synthetic-secret'));
    }
  } finally { await run('docker', ['rm', '-f', name]).catch(() => {}); }
});
