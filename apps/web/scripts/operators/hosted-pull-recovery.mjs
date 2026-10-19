import { createInterface } from 'node:readline/promises';
import { ARM_PHRASE, HOSTED_ORIGIN, runPullResponseLoss } from './pull-response-loss.mjs';
import { finishRecoveryBrowser } from './recovery-browser.mjs';

// No argument is accepted, including credentials, fixture targets or output paths.
if (process.argv.length !== 2 || !process.stdin.isTTY) {
  process.stderr.write('TARGET_REJECTED\n'); process.exitCode = 1;
} else {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let browser;
  let resolved = false, closeApproved = false;
  const interrupted = () => { terminal.close(); process.exitCode = 1; };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, interrupted);
  try {
    process.stdout.write(`Approved operator window required. Target: ${HOSTED_ORIGIN}\n`);
    const alias = await terminal.question('Account alias (A or B): ');
    if (!['A', 'B'].includes(alias)) throw new Error();
    const confirmation = await terminal.question(`Type ${ARM_PHRASE}: `);
    if (confirmation !== ARM_PHRASE) throw new Error();
    const { chromium } = await import('@playwright/test');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
    const page = await context.newPage();
    await page.goto(`${HOSTED_ORIGIN}/pulls`);
    await terminal.question('Sign in privately in the browser, open Pulls, then press Enter here. Do not click Open yet. ');
    const armed = runPullResponseLoss(page, { origin: HOSTED_ORIGIN, mode: 'hosted', expectedDisplayName: `Playtest ${alias}`, confirmation,
      onArmed: () => process.stdout.write('Armed. Click the single Open button once; do not retry.\n') });
    const result = await armed;
    resolved = result.result === 'pass';
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.result === 'pass' ? 0 : 1;
    // Uncertain pending data remains in this browser until the operator has
    // inspected the original receipt; never silently close/replace the context.
    await terminal.question('Inspect the original pending receipt before any further purchase. Press Enter only when safe to close this browser. ');
    closeApproved = true;
  } catch { process.stderr.write('TARGET_REJECTED\n'); process.exitCode = 1; }
  finally {
    terminal.close();
    if (browser?.isConnected() && !resolved && !closeApproved) process.stderr.write('UNCONFIRMED_COMMIT: browser retained; inspect the original receipt, then close its window manually.\n');
    await finishRecoveryBrowser(browser, { resolved, closeApproved });
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, interrupted);
  }
}
