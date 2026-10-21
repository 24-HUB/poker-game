import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
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
test('real age pipeline restores auth/replay with egress denied and rejects missing content, corruption and manifest mismatch', { timeout: 360000 }, async (t) => {
  const { startIsolatedRunner, privateProcess, restoreArchive, RESTORE_PHRASE } = await import('./restore-host.mjs');
  const { inspectRestoreIsolation, verifyRestoreIsolation } = await import('./restore-isolation.mjs');
  const candidate = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const isolated = await startIsolatedRunner(candidate);
  const temporary = await mkdtemp(join(tmpdir(), 'poker-age-fixture-'));
  let retained = [];
  try {
    assert.equal(verifyRestoreIsolation(await inspectRestoreIsolation(isolated.mongo, isolated.runner)).ok, true);
    const generated = JSON.parse((await privateProcess('docker', ['exec', '-i', isolated.runner, 'node', 'scripts/operations/restore-fixture.mjs'],
      JSON.stringify({ uri: isolated.uri, database: isolated.database }))).toString());
    t.diagnostic('GENERATED_FIXTURE_READY');
    const dump = await privateProcess('docker', ['exec', isolated.mongo, 'mongodump', '--config=/tmp/restore.yml', `--db=${isolated.database}`, '--archive', '--gzip', '--quiet']);
    // The name poker_playtest exists ONLY inside this generated network-none
    // fixture, to exercise the production pipeline's exact namespace mapping.
    await privateProcess('docker', ['exec', '-i', isolated.mongo, 'mongorestore', '--config=/tmp/restore.yml', '--archive', '--gzip', '--quiet', '--stopOnError',
      `--nsInclude=${isolated.database}.*`, `--nsFrom=${isolated.database}.*`, '--nsTo=poker_playtest.*'], dump);
    const sourceDump = await privateProcess('docker', ['exec', isolated.mongo, 'mongodump', '--config=/tmp/restore.yml', '--db=poker_playtest', '--archive', '--gzip', '--quiet']);
    const key = join(temporary, 'fixture.key');
    await privateProcess('age-keygen', ['-o', key]);
    const recipient = (await privateProcess('age-keygen', ['-y', key])).toString().trim();
    const encrypt = (bytes) => privateProcess('age', ['-r', recipient], bytes);
    const archive = join(temporary, 'fixture.archive.age'), manifestArchive = join(temporary, 'fixture.manifest.age');
    const encrypted = await encrypt(sourceDump);
    await writeFile(archive, encrypted); await writeFile(manifestArchive, await encrypt(JSON.stringify(generated.manifest)));
    const input = { confirmation: RESTORE_PHRASE, candidate, archive, manifestArchive, key,
      sha256: createHash('sha256').update(encrypted).digest('hex'), accounts: generated.accounts };
    const result = await restoreArchive(input);
    assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.accounts.length, 2);
    for (const row of result.accounts) assert.deepEqual(row, { alias: row.alias, signedIn: true, receiptReplayUnchanged: true, progressionUnchanged: true });
    t.diagnostic('NORMAL_RESTORE_PASSED');
    // A successful account check must still reject when detached workloads
    // cannot be removed. Fault only removal; use actual Docker inspection.
    const { cleanupRestoreContainers } = await import('./restore-cleanup.mjs');
    await assert.rejects(restoreArchive(input, { cleanupCommand: async (command, args, options) => {
      if (args[0] === 'rm') throw new Error('private-driver-marker');
      return run(command, args, options);
    } }), (error) => {
      assert.equal(error.code, 'CLEANUP_INCOMPLETE');
      retained = error.containers;
      assert.equal(retained.length, 2);
      assert.ok(!JSON.stringify(error).includes('private-driver-marker'));
      return true;
    });
    for (const name of retained) assert.equal(JSON.parse((await run('docker', ['inspect', name])).stdout)[0].State.Running, true);
    await cleanupRestoreContainers(retained); retained = [];
    const missing = await restoreArchive({ ...input, accounts: generated.accounts.map((account) => ({ ...account, requestIds: [randomUUID()] })) });
    assert.equal(missing.ok, false); assert.ok(missing.violations.includes('CONTENT_MISSING'));
    await assert.rejects(restoreArchive({ ...input, confirmation: '' }), /ISOLATION_FAILED/);
    await assert.rejects(restoreArchive({ ...input, sha256: '0'.repeat(64) }), /ISOLATION_FAILED/);
    const corrupted = Buffer.from(encrypted); corrupted[corrupted.length - 1] ^= 1;
    await writeFile(archive, corrupted);
    await assert.rejects(restoreArchive({ ...input, sha256: createHash('sha256').update(corrupted).digest('hex') }), /ISOLATION_FAILED/);
    await writeFile(archive, await encrypt(Buffer.from('not a mongodump archive')));
    const invalid = await readFile(archive);
    await assert.rejects(restoreArchive({ ...input, sha256: createHash('sha256').update(invalid).digest('hex') }), /ISOLATION_FAILED/);
    await writeFile(archive, encrypted);
    await writeFile(manifestArchive, await encrypt('{}'));
    const mismatch = await restoreArchive(input);
    assert.equal(mismatch.ok, false); assert.deepEqual(mismatch.accounts, []);
    assert.deepEqual(mismatch.violations, ['PROGRESSION_MISMATCH']);
  } finally {
    if (retained.length) await (await import('./restore-cleanup.mjs')).cleanupRestoreContainers(retained);
    await isolated.cleanup();
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(temporary.startsWith(join(tmpdir(), 'poker-age-fixture-')));
    await rm(temporary, { recursive: true, force: true });
  }
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
test('actual unsafe Docker configuration is rejected before any archive is read', { timeout: 60000 }, async () => {
  const { inspectRestoreIsolation, verifyRestoreIsolation } = await import('./restore-isolation.mjs');
  const name = `poker-unsafe-fixture-${randomUUID()}`;
  const temporary = await mkdtemp(join(tmpdir(), 'poker-empty-mount-'));
  try {
    await run('docker', ['run', '--rm', '-d', '--name', name, '--network', 'bridge', '--publish', '127.0.0.1::27017',
      '--mount', `type=bind,source=${temporary},destination=/source,readonly`, '--env', 'MONGODB_URI=synthetic-source-marker',
      'mongo:8.0.17', 'sleep', '120']);
    const result = verifyRestoreIsolation(await inspectRestoreIsolation(name));
    assert.equal(result.ok, false);
    for (const label of ['NETWORK_MODE', 'PUBLISHED_PORT', 'HOST_MOUNT', 'SOURCE_CONFIG', 'DEFAULT_ROUTE']) assert.ok(result.violations.includes(label));
    assert.ok(!JSON.stringify(result).includes('synthetic-source-marker'));
  } finally {
    await run('docker', ['rm', '-f', name]).catch(() => {});
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(temporary.startsWith(join(tmpdir(), 'poker-empty-mount-')));
    await rm(temporary, { recursive: true, force: true });
  }
});
