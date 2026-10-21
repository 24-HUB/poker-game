import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import { cleanupRestoreContainers, formatCleanupFailure } from './restore-cleanup.mjs';
const run = promisify(execFile);
const pair = () => { const id = randomUUID(); return [`poker-restore-app-${id}`, `poker-restore-db-${id}`]; };

test('failed removal attempts both containers and rejects with sanitized recovery identities', async () => {
  const names = pair(), attempts = [];
  const execute = async (_command, args) => {
    if (args[0] === 'rm') { attempts.push(args[2]); throw new Error('private-driver-marker'); }
    return { stdout: names.join('\n') };
  };
  await assert.rejects(cleanupRestoreContainers(names, execute), (error) => {
    assert.equal(error.code, 'CLEANUP_INCOMPLETE');
    assert.deepEqual(error.containers, names);
    assert.ok(!JSON.stringify(error).includes('private-driver-marker'));
    assert.match(formatCleanupFailure(error), /restore not certified/);
    assert.match(formatCleanupFailure(error), /docker rm -f/);
    assert.ok(!formatCleanupFailure(error).includes('private-driver-marker'));
    return true;
  });
  assert.deepEqual(attempts, names);
});
test('unsafe names cannot reach Docker or appear in recovery instructions', async () => {
  let executed = false;
  await assert.rejects(cleanupRestoreContainers(['private-driver-marker'], async () => { executed = true; }), /ISOLATION_FAILED/);
  assert.equal(executed, false);
  assert.ok(!formatCleanupFailure({ containers: ['private-driver-marker'] }).includes('private-driver-marker'));
});
test('removal exit success cannot pass while verification still finds a container', async () => {
  const names = pair();
  const execute = async (_command, args) => ({ stdout: args[0] === 'ps' ? names[0] : '' });
  await assert.rejects(cleanupRestoreContainers(names, execute), { code: 'CLEANUP_INCOMPLETE' });
});
test('unavailable teardown verification fails closed without raw Docker diagnostics', async () => {
  const names = pair();
  const execute = async (_command, args) => {
    if (args[0] === 'ps') throw new Error('private-driver-marker');
    return { stdout: '' };
  };
  await assert.rejects(cleanupRestoreContainers(names, execute), { code: 'CLEANUP_INCOMPLETE' });
});
test('real disposable containers are both absent after successful teardown', { timeout: 60000 }, async () => {
  const names = pair();
  try {
    for (const name of names) await run('docker', ['run', '--rm', '-d', '--name', name, '--network', 'none', '--tmpfs', '/data/db', '--tmpfs', '/data/configdb', 'mongo:8.0.17', 'sleep', '120']);
    await cleanupRestoreContainers(names);
    const remaining = (await run('docker', ['ps', '-a', '--format', '{{.Names}}'])).stdout.split(/\r?\n/);
    for (const name of names) assert.equal(remaining.includes(name), false);
  } finally { for (const name of names) await run('docker', ['rm', '-f', name]).catch(() => {}); }
});
