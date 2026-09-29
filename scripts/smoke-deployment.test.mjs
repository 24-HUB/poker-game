import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./smoke-deployment.mjs', import.meta.url));

test('accepts a public shell and an authoritative ready response', async (context) => {
  const server = createServer((request, response) => {
    if (request.url === '/') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<!doctype html><title>Poker</title>');
      return;
    }
    if (request.url === '/api/health/ready') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ready' }));
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === 'object');

  const result = await runSmoke(`http://127.0.0.1:${address.port}`);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /shell: 200/);
  assert.match(result.stdout, /readiness: ready/);
});

test('fails clearly for an unavailable origin without printing secrets', async () => {
  const secret = 'must-never-appear-in-smoke-output';
  const result = await runSmoke('http://127.0.0.1:9', { PROXY_SECRET: secret });

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Deployment smoke failed/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
});

function runSmoke(publicOrigin, extraEnvironment = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, ...extraEnvironment, PUBLIC_ORIGIN: publicOrigin, SMOKE_TIMEOUT_MS: '500' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.once('exit', (code) => resolve({ code, stdout, stderr }));
  });
}
