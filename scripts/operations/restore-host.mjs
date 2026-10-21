import { spawn, execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { inspectRestoreIsolation, verifyRestoreIsolation } from './restore-isolation.mjs';
import { cleanupRestoreContainers, CleanupIncompleteError, formatCleanupFailure } from './restore-cleanup.mjs';
const run = promisify(execFile);
export const RESTORE_PHRASE = 'RESTORE ARCHIVE INTO ISOLATED LOCAL RUNNER';

// Child output is private in-memory data, never included in an exception/log.
export async function privateProcess(command, args, input, timeout = 120000, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const chunks = []; let size = 0, failed = false;
    const timer = setTimeout(() => { failed = true; child.kill(); reject(new Error('ISOLATION_FAILED')); }, timeout);
    child.stdout.on('data', (chunk) => { size += chunk.length; if (size > 32 * 1024 * 1024) { failed = true; child.kill(); } else chunks.push(chunk); });
    child.stderr.resume(); child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); reject(new Error('ISOLATION_FAILED')); });
    child.on('close', (code) => { clearTimeout(timer); if (failed || code && !allowFailure) reject(new Error('ISOLATION_FAILED')); else resolve(Buffer.concat(chunks)); });
    child.stdin.end(input);
  });
}
export async function startIsolatedRunner(candidate, { cleanupCommand = run } = {}) {
  if (!/^[a-f0-9]{40}$/.test(candidate)) throw new Error('ISOLATION_FAILED');
  const image = `poker-restore:${candidate}`;
  const imageInfo = JSON.parse((await run('docker', ['image', 'inspect', image])).stdout)[0];
  if (imageInfo.Config?.Labels?.['poker.restore.candidate'] !== candidate) throw new Error('ISOLATION_FAILED');
  const suffix = randomUUID(), mongo = `poker-restore-db-${suffix}`, runner = `poker-restore-app-${suffix}`;
  const database = `poker_test_restore_${randomUUID().replaceAll('-', '')}`, password = randomBytes(32).toString('hex');
  const cleanup = () => cleanupRestoreContainers([runner, mongo], cleanupCommand);
  let stage = 'DB_START';
  try {
    const id = (await run('docker', ['run', '--rm', '-d', '--name', mongo, '--network', 'none', '--tmpfs', '/data/db', '--tmpfs', '/data/configdb', '--tmpfs', '/tmp',
      'mongo:8.0.17', 'bash', '-c', 'head -c 756 /dev/urandom | base64 > /tmp/key; chmod 400 /tmp/key; chown mongodb /tmp/key /data/db; exec gosu mongodb mongod --replSet rs0 --keyFile /tmp/key --bind_ip 127.0.0.1 --setParameter ttlMonitorEnabled=false'], { timeout: 30000 })).stdout.trim();
    stage = 'APP_START';
    await run('docker', ['run', '--rm', '-d', '--name', runner, '--network', `container:${id}`, '--tmpfs', '/tmp', image], { timeout: 120000 });
    stage = 'CONTAINMENT';
    if (!verifyRestoreIsolation(await inspectRestoreIsolation(mongo, runner)).ok) throw new Error('ISOLATION_FAILED');
    const shell = (script) => privateProcess('docker', ['exec', '-i', mongo, 'mongosh', '--quiet'], script);
    const wait = async (script) => {
      for (let i = 0; i < 100; i++) {
        try { await shell(script); return; } catch { await new Promise((resolve) => setTimeout(resolve, 200)); }
      }
      throw new Error('ISOLATION_FAILED');
    };
    stage = 'PING';
    await wait("if(!db.adminCommand('ping').ok)quit(1)");
    stage = 'INIT';
    await shell("rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})");
    stage = 'PRIMARY';
    await wait('if(!db.hello().isWritablePrimary)quit(1)');
    stage = 'AUTH';
    await shell(`db.getSiblingDB('admin').createUser({user:'localRestore',pwd:'${password}',roles:['root']})`);
    const uri = `mongodb://localRestore:${password}@127.0.0.1:27017/?authSource=admin&replicaSet=rs0&directConnection=true`;
    await privateProcess('docker', ['exec', '-i', mongo, 'sh', '-c', 'umask 077; cat > /tmp/restore.yml'], JSON.stringify({ uri }));
    return { mongo, runner, database, uri, cleanup };
  } catch { await cleanup(); throw new Error('ISOLATION_FAILED', { cause: stage }); }
}

export async function restoreArchive(input, options) {
  if (input?.confirmation !== RESTORE_PHRASE || !/^[a-f0-9]{40}$/.test(input.candidate ?? '')
    || !/^[a-f0-9]{64}$/.test(input.sha256 ?? '') || typeof input.archive !== 'string' || typeof input.key !== 'string'
    || typeof input.manifestArchive !== 'string') throw new Error('ISOLATION_FAILED');
  const started = Date.now();
  const isolated = await startIsolatedRunner(input.candidate, options);
  try {
    const sha = createHash('sha256');
    for await (const chunk of createReadStream(input.archive)) sha.update(chunk);
    if (sha.digest('hex') !== input.sha256) throw new Error('ISOLATION_FAILED');
    // No real bytes are decrypted until actual Docker containment has passed.
    const manifest = JSON.parse((await privateProcess('age', ['--decrypt', '-i', input.key, input.manifestArchive])).toString('utf8'));
    // Stream age -> authenticated mongorestore; both exits must succeed. No plaintext host file.
    await new Promise((resolve, reject) => {
      const age = spawn('age', ['--decrypt', '-i', input.key, input.archive], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      const restore = spawn('docker', ['exec', '-i', isolated.mongo, 'mongorestore', '--config=/tmp/restore.yml', '--archive', '--gzip', '--quiet', '--stopOnError',
        '--nsInclude=poker_playtest.*', '--nsFrom=poker_playtest.*', `--nsTo=${isolated.database}.*`], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
      const timer = setTimeout(() => { age.kill(); restore.kill(); reject(new Error('ISOLATION_FAILED')); }, 120000);
      let remaining = 2, failed = false;
      const done = (code) => { failed ||= code !== 0; if (--remaining === 0) { clearTimeout(timer); failed ? reject(new Error('ISOLATION_FAILED')) : resolve(); } };
      age.stderr.resume(); restore.stderr.resume(); restore.stdin.on('error', () => {}); age.stdout.pipe(restore.stdin);
      for (const child of [age, restore]) { child.on('error', () => { clearTimeout(timer); age.kill(); restore.kill(); reject(new Error('ISOLATION_FAILED')); }); child.on('close', done); }
    });
    const output = await privateProcess('docker', ['exec', '-i', isolated.runner, 'node', 'scripts/operations/run-restored-app.mjs'],
      JSON.stringify({ ...isolated, cleanup: undefined, accounts: input.accounts, manifest }), 180000, true);
    const report = JSON.parse(output.toString('utf8'));
    if (!verifyRestoreIsolation(await inspectRestoreIsolation(isolated.mongo, isolated.runner)).ok) throw new Error('ISOLATION_FAILED');
    const labels = ['ISOLATION_FAILED', 'CONTENT_MISSING', 'AUTH_FAILED', 'RECEIPT_MISMATCH', 'PROGRESSION_MISMATCH', 'ECONOMY_MISMATCH'];
    if (typeof report.ok !== 'boolean' || !Array.isArray(report.violations) || report.violations.some((label) => !labels.includes(label))
      || !Array.isArray(report.accounts) || report.accounts.some((row) => !['A', 'B'].includes(row.alias)
        || ['signedIn', 'receiptReplayUnchanged', 'progressionUnchanged'].some((key) => typeof row[key] !== 'boolean'))) throw new Error('ISOLATION_FAILED');
    return { ok: report.ok, violations: report.violations,
      accounts: report.accounts.map(({ alias, signedIn, receiptReplayUnchanged, progressionUnchanged }) => ({ alias, signedIn, receiptReplayUnchanged, progressionUnchanged })), elapsedMs: Date.now() - started };
  } finally { await isolated.cleanup(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 2) throw new Error();
    let input = '', bytes = 0;
    for await (const chunk of process.stdin) { bytes += chunk.length; if (bytes > 1024 * 1024) throw new Error(); input += chunk; }
    const report = await restoreArchive(JSON.parse(input));
    process.stdout.write(JSON.stringify(report) + '\n'); process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write((error instanceof CleanupIncompleteError ? formatCleanupFailure(error) : 'ISOLATION_FAILED') + '\n');
    process.exitCode = 1;
  }
}
