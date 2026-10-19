import { isDeepStrictEqual } from 'node:util';
import { pullReceiptSchema, pullRequestSchema } from '@poker/contracts';

export const HOSTED_ORIGIN = 'https://poker-game.nearyou1474.workers.dev';
export const ARM_PHRASE = 'WITHHOLD ONE 5-TICKET PULL RESPONSE';
export function validateTarget(origin, mode) {
  let url;
  try { url = new URL(origin); } catch { throw new Error('TARGET_REJECTED'); }
  const expected = mode === 'hosted' ? HOSTED_ORIGIN : mode === 'fixture' ? 'http://127.0.0.1:3100' : null;
  if (!expected || url.origin !== expected || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('TARGET_REJECTED');
  return url;
}
const report = (result, mismatches, committed = false, sameReceipt = false, singleDebit = false) =>
  ({ result, committed, sameReceipt, singleDebit, mismatches });

// No clicks, new request IDs, storage mutation or recorded network payloads here.
// onArmed signals completion of preflight; it receives no private data.
export async function runPullResponseLoss(page, options) {
  try { validateTarget(options.origin, options.mode); } catch { return report('blocked', ['TARGET_REJECTED']); }
  if (options.confirmation !== ARM_PHRASE || !options.expectedDisplayName
    || options.mode === 'hosted' && !['Playtest A', 'Playtest B'].includes(options.expectedDisplayName)) return report('blocked', ['TARGET_REJECTED']);
  const origin = new URL(options.origin).origin;
  const read = async (path) => page.evaluate(async (path) => {
    const response = await fetch(path, { cache: 'no-store', redirect: 'error' });
    if (!response.ok) throw new Error('READ_UNAVAILABLE');
    return (await response.json()).data;
  }, path);
  let before, identity;
  try {
    if (new URL(page.url()).origin !== origin) return report('blocked', ['TARGET_REJECTED']);
    identity = await read('/api/me');
    if (identity?.displayName !== options.expectedDisplayName) return report('blocked', ['IDENTITY_MISMATCH']);
    before = await read('/api/wallet');
    if (!Number.isSafeInteger(before?.balance) || before.balance < 5) return report('blocked', ['UNEXPECTED_DEBIT']);
  } catch { return report('blocked', ['IDENTITY_MISMATCH']); }
  let seen = 0, receipt, mismatch;
  let signal;
  const attempted = new Promise((resolve) => { signal = resolve; });
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let finishHandler;
  const handlerDone = new Promise((resolve) => { finishHandler = resolve; });
  const matcher = (url) => url.origin === origin && url.pathname === '/api/pulls';
  const handler = async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    seen += 1;
    if (seen !== 1) { mismatch = 'UNEXPECTED_POST'; await route.abort().catch(() => {}); signal(); return; }
    try {
      const input = pullRequestSchema.parse(route.request().postDataJSON());
      if (input.count !== 1 || new URL(route.request().url()).search) throw new Error();
      const response = await route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 30_000 });
      if (response.status() !== 201) { mismatch = 'REJECTED_PURCHASE'; return; }
      receipt = pullReceiptSchema.parse((await response.json()).data);
      if (receipt.requestId !== input.requestId || receipt.bannerVersion !== input.bannerVersion
        || receipt.count !== 1 || receipt.cost !== 5) { receipt = undefined; mismatch = 'RECEIPT_MISMATCH'; }
    } catch { mismatch = 'UNCONFIRMED_COMMIT'; }
    finally {
      signal();
      await held;
      await route.abort().catch(() => {});
      finishHandler();
    }
  };
  let timer;
  try {
    await page.route(matcher, handler);
    await options.onArmed?.();
    await Promise.race([attempted, new Promise((resolve) => { timer = setTimeout(resolve, options.mode === 'fixture' ? 30_000 : 300_000); })]);
    clearTimeout(timer);
    if (!receipt || mismatch) return report('blocked', [mismatch ?? 'UNCONFIRMED_COMMIT'], Boolean(receipt));
    // Reload cancels the held response. Keep POST interception installed while
    // normal GET recovery runs, so a surprising retry cannot create a new debit.
    const recovery = page.waitForResponse((response) => response.url() === `${origin}/api/pulls/${receipt.requestId}`
      && response.request().method() === 'GET', { timeout: 30_000 });
    // Always consume a possible timeout rejection even if reload itself fails.
    recovery.catch(() => {});
    await page.reload();
    release();
    const recoveredResponse = await recovery;
    const recovered = pullReceiptSchema.parse((await recoveredResponse.json()).data);
    const after = await read('/api/wallet');
    const current = await read('/api/me');
    const sameReceipt = recoveredResponse.status() === 200 && isDeepStrictEqual(recovered, receipt);
    const singleDebit = after.balance === before.balance - 5 && after.revision === receipt.walletRevision
      && receipt.walletRevision === before.revision + 1;
    const mismatches = [...(sameReceipt ? [] : ['RECEIPT_MISMATCH']), ...(singleDebit ? [] : ['UNEXPECTED_DEBIT']),
      ...(current.accountId === identity.accountId ? [] : ['IDENTITY_MISMATCH']), ...(seen === 1 ? [] : ['UNEXPECTED_POST'])];
    return report(mismatches.length ? 'fail' : 'pass', mismatches, true, sameReceipt, singleDebit);
  } catch { return report('blocked', [mismatch ?? 'UNCONFIRMED_COMMIT'], Boolean(receipt)); }
  finally {
    clearTimeout(timer); release();
    // Removing an executing handler before abort has completed can allow the
    // original browser request through in addition to route.fetch's forward.
    if (seen) await handlerDone;
    await page.unroute(matcher, handler).catch(() => {});
  }
}
