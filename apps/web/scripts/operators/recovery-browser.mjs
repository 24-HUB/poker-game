// An unresolved session is kept alive in memory even after terminal EOF or a
// graceful interrupt. Only the human closing its window ends that recovery.
export function launchRecoveryBrowser(chromium, { headless = false } = {}) {
  return chromium.launch({ headless, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
}

export async function finishRecoveryBrowser(browser, { resolved, closeApproved }) {
  if (!browser?.isConnected()) return;
  if (resolved || closeApproved) { await browser.close(); return; }
  await new Promise((resolve) => browser.once('disconnected', resolve));
}
