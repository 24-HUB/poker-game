import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const candidate = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
if (!/^[a-f0-9]{40}$/.test(candidate) || (await run('git', ['status', '--porcelain'])).stdout.trim()) throw new Error('CLEAN_COMMITTED_CANDIDATE_REQUIRED');
// No arbitrary build-context path; Git emits only these tracked source trees.
const archive = spawn('git', ['archive', '--format=tar', candidate, 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json',
  'apps/server', 'apps/web', 'packages', 'scripts/operations', 'scripts/support', 'scripts/verify-economy.mjs'], { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true });
const build = spawn('docker', ['build', '--build-arg', `CANDIDATE=${candidate}`, '-f', 'scripts/operations/restore-runner.Dockerfile', '-t', `poker-restore:${candidate}`, '-'],
  { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true });
archive.stdout.pipe(build.stdin);
build.stdin.on('error', () => {});
const closed = (child) => new Promise((resolve, reject) => { child.on('error', reject); child.on('close', (code) => resolve(code)); });
const statuses = await Promise.all([closed(archive), closed(build)]);
if (statuses.some((code) => code !== 0)) process.exitCode = 1;
