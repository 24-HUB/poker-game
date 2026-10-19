import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { MongoClient } from 'mongodb';
import { checkRestoredAccounts, restoreManifest } from './restore-account-check.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const httpProxy = require('http-proxy');
let client, app, frontend, gateway, proxy;
const fail = () => ({ ok: false, accounts: [], violations: ['ISOLATION_FAILED'], elapsedMs: 0 });
try {
  let bytes = 0, text = '';
  for await (const chunk of process.stdin) { bytes += chunk.length; if (bytes > 4 * 1024 * 1024) throw new Error(); text += chunk; }
  const input = JSON.parse(text); text = '';
  const uri = new URL(input.uri);
  if (uri.protocol !== 'mongodb:' || uri.hostname !== '127.0.0.1' || uri.port !== '27017'
    || !/^poker_test_restore_[a-f0-9]{32}$/.test(input.database) || !input.manifest) throw new Error();
  client = await new MongoClient(input.uri, { serverSelectionTimeoutMS: 5000 }).connect();
  const db = client.db(input.database);
  // This comparison precedes all auth/lease/app writes. No migrations or seed helpers.
  if (!isDeepStrictEqual(await restoreManifest(db), input.manifest)) {
    process.stdout.write(JSON.stringify({ ...fail(), violations: ['PROGRESSION_MISMATCH'] }) + '\n'); process.exitCode = 1;
  } else {
    const secret = randomBytes(32).toString('hex');
    Object.assign(process.env, {
      NODE_ENV: 'test', PUBLIC_ORIGIN: 'http://127.0.0.1:3100', PORT: '3102',
      PROXY_SECRET: secret, MONGODB_URI: input.uri, MONGODB_DATABASE: input.database,
      BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
      REGISTRATION_INVITE_CODE_SHA256: createHash('sha256').update(randomBytes(32)).digest('hex'),
      ACCOUNT_EMAIL_TRANSPORT: 'memory', ACCOUNT_RECOVERY_ENFORCED: 'true',
      ALLOW_NEW_SESSIONS: 'false', ECONOMY_WRITES_ENABLED: 'false',
    });
    const serverRequire = createRequire(new URL('../../apps/server/package.json', import.meta.url));
    app = await serverRequire('./dist/main.js').createApplication();
    await app.listen(3102, '127.0.0.1');
    frontend = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3101'],
      { cwd: '/app/apps/web', env: { PATH: process.env.PATH, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore' });
    proxy = httpProxy.createProxyServer({ ws: true });
    const backend = (url) => /^\/(api|socket\.io|health)(\/|\?|$)/.test(url ?? '');
    proxy.on('proxyReq', (request, original) => { if (backend(original.url)) request.setHeader('x-poker-proxy-secret', secret); });
    proxy.on('error', (_error, _request, response) => { if (response && 'writeHead' in response) { response.writeHead(503); response.end(); } });
    gateway = createServer((request, response) => proxy.web(request, response, { target: backend(request.url) ? 'http://127.0.0.1:3102' : 'http://127.0.0.1:3101' }));
    gateway.on('upgrade', (request, socket, head) => {
      if (backend(request.url)) request.headers['x-poker-proxy-secret'] = secret;
      proxy.ws(request, socket, head, { target: backend(request.url) ? 'http://127.0.0.1:3102' : 'http://127.0.0.1:3101' });
    });
    await new Promise((resolve) => gateway.listen(3100, '127.0.0.1', resolve));
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { ready = (await fetch('http://127.0.0.1:3101', { signal: AbortSignal.timeout(1000) })).ok; } catch { /* bounded startup */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error();
    const report = await checkRestoredAccounts({ ...input, origin: 'http://127.0.0.1:3100' }, db);
    process.stdout.write(JSON.stringify(report) + '\n'); process.exitCode = report.ok ? 0 : 1;
  }
} catch { process.stdout.write(JSON.stringify(fail()) + '\n'); process.exitCode = 1; }
finally { gateway?.closeAllConnections(); gateway?.close(); proxy?.close(); frontend?.kill(); await app?.close(); await client?.close(); }
