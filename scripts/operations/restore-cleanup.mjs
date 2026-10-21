import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const containerName = /^poker-restore-(?:app|db)-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;

export class CleanupIncompleteError extends Error {
  constructor(containers) {
    super('CLEANUP_INCOMPLETE');
    this.code = 'CLEANUP_INCOMPLETE';
    this.containers = [...containers];
  }
}

export function formatCleanupFailure(error) {
  const names = (error.containers ?? []).filter((name) => typeof name === 'string' && containerName.test(name));
  const action = names.length ? `run: docker rm -f ${names.join(' ')}.` : 'inspect the task-created restore containers.';
  return `CLEANUP_INCOMPLETE: restore not certified. When Docker is available, ${action} Verify those containers are absent before certifying or reopening. Retain encrypted backups.`;
}

export async function cleanupRestoreContainers(names, execute = run) {
  if (!Array.isArray(names) || !names.length || names.length > 2 || names.some((name) => !containerName.test(name))) throw new Error('ISOLATION_FAILED');
  // A failed first removal must not prevent the second attempt. Command exit
  // alone is insufficient: only a successful post-removal listing proves absence.
  for (const name of names) await execute('docker', ['rm', '-f', name], { timeout: 15000 }).catch(() => {});
  let remaining;
  try { remaining = (await execute('docker', ['ps', '-a', '--filter', 'name=poker-restore-', '--format', '{{.Names}}'], { timeout: 10000 })).stdout.split(/\r?\n/); }
  catch { throw new CleanupIncompleteError(names); }
  const retained = names.filter((name) => remaining.includes(name));
  if (retained.length) throw new CleanupIncompleteError(retained);
}
