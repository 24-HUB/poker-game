import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import httpProxy from 'http-proxy';
import { MongoClient } from 'mongodb';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(webRoot, '../..');
const backendOrigin = 'http://127.0.0.1:3102';
const frontendOrigin = 'http://127.0.0.1:3101';
const publicOrigin = 'http://127.0.0.1:3100';
const proxySecret = 'e2e-only-proxy-secret-with-32-characters';
const registrationCode = 'E2E-PRIVATE-CODE';
const databaseName = `poker_e2e_${process.pid}_${Date.now()}`;
const pnpmCli = process.env.npm_execpath;
const pnpmCommand = pnpmCli
  ? pnpmCli.toLowerCase().endsWith('.exe')
    ? { command: pnpmCli, args: [] }
    : { command: process.execPath, args: [pnpmCli] }
  : process.platform === 'win32'
    ? { command: process.env.ComSpec ?? 'cmd.exe', args: ['/d', '/s', '/c', 'pnpm'] }
    : { command: 'pnpm', args: [] };
const children = new Set();

const backendEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: '3102',
  PUBLIC_ORIGIN: publicOrigin,
  PROXY_SECRET: proxySecret,
  MONGODB_URI: 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
  MONGODB_DATABASE: databaseName,
  BETTER_AUTH_SECRET: 'e2e-only-better-auth-secret-with-32-characters',
  REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(registrationCode).digest('hex'),
};

await runPreparation(['--filter', '@poker/contracts', 'build']);
await runPreparation(['--filter', '@poker/poker-engine', 'build']);
await runPreparation(['--filter', '@poker/server', 'build']);
await runPreparation(['--filter', '@poker/server', 'db:migrate'], backendEnvironment);

let backend = launchBackend();
const frontend = start(pnpmCommand.command, [...pnpmCommand.args, '--filter', '@poker/web', 'dev', '--hostname', '127.0.0.1', '--port', '3101']);

const proxy = httpProxy.createProxyServer({ ws: true });
proxy.on('proxyReq', (proxyRequest, request) => {
  if (isBackendPath(request.url)) proxyRequest.setHeader('x-poker-proxy-secret', proxySecret);
});
proxy.on('error', (_error, _request, response) => {
  if (!response || 'destroyed' in response && response.destroyed) return;
  if ('writeHead' in response) {
    response.writeHead(502, { 'cache-control': 'no-store', 'content-type': 'text/plain' });
    response.end('Local test service is starting.');
  }
});

const gateway = createServer((request, response) => {
  if (new URL(request.url ?? '/', publicOrigin).pathname === '/__e2e/restart-backend') {
    void handleBackendRestart(request, response);
    return;
  }
  proxy.web(request, response, { target: isBackendPath(request.url) ? backendOrigin : frontendOrigin });
});
gateway.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/socket.io')) {
    request.headers['x-poker-proxy-secret'] = proxySecret;
    proxy.ws(request, socket, head, { target: backendOrigin });
  } else {
    proxy.ws(request, socket, head, { target: frontendOrigin });
  }
});

gateway.listen(3100, '127.0.0.1');

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  gateway.close();
  proxy.close();
  for (const child of children) child.kill();
  setTimeout(() => process.exit(exitCode), 250).unref();
}

frontend.once('exit', (code) => stop(code ?? 1));
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());

function isBackendPath(url) {
  if (!url) return false;
  const pathname = new URL(url, publicOrigin).pathname;
  return pathname === '/api' || pathname.startsWith('/api/') || pathname === '/socket.io' || pathname.startsWith('/socket.io/');
}

let restartDelayMs = null;

function launchBackend() {
  const child = start(process.execPath, ['apps/server/dist/main.js'], backendEnvironment);
  child.once('exit', (code) => {
    if (stopping) return;
    if (restartDelayMs === null) {
      stop(code ?? 1);
      return;
    }
    const delayMs = restartDelayMs;
    restartDelayMs = null;
    void expirePreviousAuthority().then(() => {
      setTimeout(() => { backend = launchBackend(); }, delayMs);
    }).catch(() => stop(1));
  });
  return child;
}

async function handleBackendRestart(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'POST' });
    response.end();
    return;
  }
  if (restartDelayMs !== null) {
    response.writeHead(409, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'restart already in progress' }));
    return;
  }
  try {
    const body = await readJson(request);
    const requestedDelay = Number(body.delayMs ?? 0);
    restartDelayMs = Number.isFinite(requestedDelay) ? Math.min(Math.max(requestedDelay, 0), 5_000) : 0;
    response.writeHead(202, { 'cache-control': 'no-store', 'content-type': 'application/json' });
    response.end(JSON.stringify({ restarting: true }));
    backend.kill();
  } catch {
    response.writeHead(400, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'invalid restart request' }));
  }
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_024) throw new Error('request too large');
  }
  return body ? JSON.parse(body) : {};
}

async function expirePreviousAuthority() {
  const client = new MongoClient(backendEnvironment.MONGODB_URI);
  try {
    await client.connect();
    await client.db(databaseName).collection('authorityLeases').updateOne(
      { _id: 'backend' },
      [{ $set: { expiresAt: '$$NOW' } }],
    );
  } finally {
    await client.close();
  }
}

function start(command, args, environment = process.env) {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

function runPreparation(args, environment = process.env) {
  return new Promise((resolvePreparation, rejectPreparation) => {
    const child = spawn(pnpmCommand.command, [...pnpmCommand.args, ...args], {
      cwd: workspaceRoot,
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPreparation);
    child.once('exit', (code) => {
      if (code === 0) resolvePreparation();
      else rejectPreparation(new Error(`pnpm ${args.join(' ')} exited with ${code}`));
    });
  });
}
