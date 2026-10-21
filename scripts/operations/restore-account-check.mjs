import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { BSON } from 'mongodb';
import { pullReceiptSchema } from '../../packages/contracts/dist/index.js';
import { verifyEconomy } from '../verify-economy.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const durableCollections = ['ticketWallets', 'ticketLedger', 'rewardReceipts', 'dailyEarnings', 'pullReceipts',
  'ownedCosmetics', 'bannerProgress', 'equipment', 'bannerVersions', 'hands'];
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const digest = (value) => createHash('sha256').update(JSON.stringify(canonical(BSON.EJSON.serialize(value, { relaxed: false })))).digest('hex');

// Private full-manifest material, returned only in memory; never write it to stdout.
export async function restoreManifest(db, names) {
  const result = {};
  const collections = (await db.listCollections().toArray()).filter((item) => !item.name.startsWith('system.')).sort((a, b) => a.name < b.name ? -1 : 1);
  for (const item of collections) {
    if (names && !names.includes(item.name)) continue;
    const rows = await db.collection(item.name).find({}).toArray();
    const indexes = (await db.collection(item.name).listIndexes().toArray()).map(({ v, ns, ...index }) => ({
      ...index, key: Object.entries(index.key), // Compound index key order is semantic.
    })).sort((a, b) => a.name < b.name ? -1 : 1);
    result[item.name] = { count: rows.length, documents: rows.map(digest).sort(), metadata: digest({ options: item.options, indexes }) };
  }
  return result;
}

export async function checkRestoredAccounts(input, db) {
  const started = Date.now();
  const result = { ok: false, accounts: [], violations: [], elapsedMs: 0 };
  const fail = (label) => { if (!result.violations.includes(label)) result.violations.push(label); };
  let browser;
  try {
    if (input?.origin !== 'http://127.0.0.1:3100' || !/^poker_test_restore_[a-f0-9]{32}$/.test(input?.database ?? '')
      || db?.databaseName !== input.database) { fail('ISOLATION_FAILED'); return result; }
    // Inside-workload defense, in addition to the host's Docker inspection before decryption.
    const routes = await readFile('/proc/net/route', 'utf8');
    if (routes.split('\n').slice(1).some((line) => line.trim().split(/\s+/)[1] === '00000000')) { fail('ISOLATION_FAILED'); return result; }
    if (!Array.isArray(input.accounts) || input.accounts.length !== 2 || new Set(input.accounts.map((row) => row.alias)).size !== 2
      || input.accounts.some((row) => !['A', 'B'].includes(row.alias) || typeof row.email !== 'string' || typeof row.password !== 'string'
        || !Array.isArray(row.requestIds) || !row.requestIds.length || row.requestIds.some((id) => !/^[a-f0-9-]{36}$/i.test(id)))
      || new Set(input.accounts.map((row) => row.email.toLowerCase())).size !== 2) { fail('CONTENT_MISSING'); return result; }
    const before = await restoreManifest(db, durableCollections);
    if (!(await verifyEconomy(db)).ok) { fail('ECONOMY_MISMATCH'); return result; }
    const { chromium } = require('@playwright/test');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const account of input.accounts) {
      const row = { alias: account.alias, signedIn: false, receiptReplayUnchanged: false, progressionUnchanged: false };
      result.accounts.push(row);
      const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
      // Loopback is reachable even though Chromium infers offline from the
      // namespace's absent uplink. This changes only the UI availability hint;
      // actual Docker/routes/TCP containment is checked before and after the run.
      await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => true }));
      try {
        const user = await db.collection('user').findOne({ email: account.email.toLowerCase() });
        const id = user?._id.toString();
        const owned = id && await db.collection('ownedCosmetics').countDocuments({ accountId: id });
        const equipped = id && await db.collection('equipment').countDocuments({ accountId: id, itemId: { $ne: null } });
        if (!id || !owned || !equipped) { fail('CONTENT_MISSING'); continue; }
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        // Use normal password sign-in UI; no fixture auth bypass on copied data.
        await page.goto(`${input.origin}/collection`);
        await page.locator('main').getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.getByRole('dialog').getByLabel('Email').fill(account.email);
        await page.getByRole('dialog').getByLabel('Password').fill(account.password);
        await page.getByRole('button', { name: 'Sign in to your club' }).click();
        await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor({ timeout: 30000 });
        const identity = await (await context.request.get(`${input.origin}/api/me`)).json();
        row.signedIn = identity.data?.accountId === id;
        if (!row.signedIn) { fail('AUTH_FAILED'); continue; }
        row.receiptReplayUnchanged = true;
        for (const requestId of account.requestIds) {
          const saved = await db.collection('pullReceipts').findOne({ accountId: id, requestId });
          if (!saved) { row.receiptReplayUnchanged = false; fail('CONTENT_MISSING'); break; }
          const receipt = pullReceiptSchema.parse(saved.receipt);
          const response = await context.request.post(`${input.origin}/api/pulls`, { headers: { origin: input.origin },
            data: { requestId, bannerVersion: receipt.bannerVersion, count: receipt.count } });
          const payload = await response.json();
          if (response.status() !== 201 || !isDeepStrictEqual(payload.data, receipt)) { row.receiptReplayUnchanged = false; fail('RECEIPT_MISMATCH'); }
        }
        row.progressionUnchanged = isDeepStrictEqual(await restoreManifest(db, durableCollections), before);
        if (!row.progressionUnchanged) fail('PROGRESSION_MISMATCH');
      } catch { fail(row.signedIn ? 'RECEIPT_MISMATCH' : 'AUTH_FAILED'); }
      finally { await context.close(); }
    }
    if (!(await verifyEconomy(db)).ok) fail('ECONOMY_MISMATCH');
    result.ok = !result.violations.length && result.accounts.every((row) => row.signedIn && row.receiptReplayUnchanged && row.progressionUnchanged);
  } catch { fail('ISOLATION_FAILED'); }
  finally { await browser?.close(); result.elapsedMs = Date.now() - started; }
  return result;
}
