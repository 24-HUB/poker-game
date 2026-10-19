import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createServer } from 'node:http';

const moduleUrl = new URL('./pull-response-loss.mjs', import.meta.url);
test('rejects unknown and credential-bearing targets', async () => {
  const { validateTarget } = await import(moduleUrl);
  for (const target of ['https://evil.invalid', 'https://secret:secret@poker-game.nearyou1474.workers.dev',
    'https://poker-game.nearyou1474.workers.dev/api', 'http://127.0.0.1:3100/?secret=secret']) {
    assert.throws(() => validateTarget(target, 'hosted'), /TARGET_REJECTED/);
  }
  assert.equal(validateTarget('http://127.0.0.1:3100', 'fixture').origin, 'http://127.0.0.1:3100');
  assert.throws(() => validateTarget('http://127.0.0.1:3100', 'hosted'), /TARGET_REJECTED/);
  assert.throws(() => validateTarget('https://poker-game.nearyou1474.workers.dev', 'unknown'), /TARGET_REJECTED/);
});
test('missing confirmation and mismatched identity cannot arm or launch a request', async () => {
  const { runPullResponseLoss } = await import(moduleUrl);
  const untouched = new Proxy({}, { get() { throw new Error('synthetic-private-secret'); } });
  const report = await runPullResponseLoss(untouched, { origin: 'http://127.0.0.1:3100', mode: 'fixture', expectedDisplayName: 'Tester' });
  assert.equal(report.result, 'blocked');
  assert.equal(report.committed, false);
  assert.ok(!JSON.stringify(report).includes('synthetic-private-secret'));
});
test('CLI rejects credential arguments before launching and prints no secret', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./hosted-pull-recovery.mjs', import.meta.url)), '--password=synthetic-private-secret'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /TARGET_REJECTED/);
  assert.ok(!(result.stderr + result.stdout).includes('synthetic-private-secret'));
});
test('unestablished commit stops without an automatic second mutation and redacts browser/server errors', { timeout: 30000 }, async () => {
  const { chromium } = await import('@playwright/test');
  const { runPullResponseLoss, ARM_PHRASE } = await import(moduleUrl);
  let posts = 0, navigations = 0;
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/api/me') return response.end(JSON.stringify({ data: { accountId: 'synthetic-secret', displayName: 'Tester' } }));
    if (request.url === '/api/wallet') return response.end(JSON.stringify({ data: { balance: 5, revision: 0 } }));
    if (request.url === '/api/pulls') { posts++; response.writeHead(503); return response.end('synthetic-secret'); }
    if (request.url === '/') navigations++;
    response.setHeader('content-type', 'text/html');
    response.end(`<button onclick='sessionStorage.setItem("pending","preserved");fetch("/api/pulls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestId:"11111111-1111-4111-8111-111111111111",bannerVersion:"test-v1",count:1})})'>Open</button>`);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3100, '127.0.0.1', resolve); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3100');
    const before = navigations;
    const report = await runPullResponseLoss(page, { origin: 'http://127.0.0.1:3100', mode: 'fixture', expectedDisplayName: 'Tester',
      confirmation: ARM_PHRASE, onArmed: () => page.getByRole('button', { name: 'Open' }).click() });
    assert.equal(report.result, 'blocked'); assert.equal(report.committed, false);
    assert.deepEqual(report.mismatches, ['REJECTED_PURCHASE']);
    assert.equal(posts, 1, 'one upstream POST'); assert.equal(navigations, before, 'no reload on uncertain commit');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('pending')), 'preserved');
    assert.ok(!JSON.stringify(report).includes('synthetic-secret'));
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
