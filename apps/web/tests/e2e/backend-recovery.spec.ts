import { expect, test, type Route } from '@playwright/test';

import { createAccountThroughNativeApi } from './support/accounts';

test.describe.configure({ mode: 'serial' });

test('a cold backend is unavailable rather than signed out and recovers automatically', async ({ page, request }) => {
  const restart = await request.post('/__e2e/restart-backend', { data: { delayMs: 2_000 } });
  expect(restart.ok(), await restart.text()).toBe(true);

  await page.goto('/');
  await expect(page.getByText('Connecting to server…').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);

  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible({ timeout: 15_000 });
});

for (const authenticated of [false, true]) {
  test(`a delayed 60-second wake restores ${authenticated ? 'the verified account' : 'Sign in'} without replaying mutations`, async ({ page }, testInfo) => {
    if (authenticated) await createAccountThroughNativeApi(page.context(), {
      displayName: 'Recovery Alice', email: `recovery-${Date.now()}@example.test`,
    });
    await page.clock.install();
    const probes: Route[] = [];
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/') && request.method() !== 'GET') mutations.push(new URL(request.url()).pathname);
    });
    await page.route('**/api/me', (route) => { probes.push(route); });
    await page.goto('/');
    await expect.poll(() => probes.length).toBe(1);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1_000)));
    for (let i = 0; i < 3; i++) {
      await page.clock.runFor(15_000);
      await probes[i]!.fulfill({ status: 504, body: 'Backend timeout' });
      await expect(page.getByText('Connecting to server…').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' }).first()).toBeEnabled();
      if (authenticated && i === 2) await page.getByRole('button', { name: 'Retry' }).first().focus();
      if (i === 0) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        for (const width of [1440, 360]) {
          await page.setViewportSize({ width, height: 900 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          await expect(page.getByText('Connecting to server…').first()).toBeVisible();
          await page.screenshot({ path: testInfo.outputPath(`recovery-${width}.png`) });
        }
      }
      await page.clock.runFor(4_999); expect(probes).toHaveLength(i + 1);
      await page.clock.runFor(1); await expect.poll(() => probes.length).toBe(i + 2);
    }
    await probes[3]!.continue();
    if (authenticated) {
      await expect(page.locator('[data-account-control]:visible')).toHaveText('Recovery Alice');
      await expect(page.locator('[data-account-control]:visible')).toBeFocused();
    }
    else await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
    await page.clock.runFor(100_000); expect(probes).toHaveLength(4);
    expect(mutations).toEqual([]);
  });
}

test('terminal recovery waits for keyboard Retry and restores focus to Sign in', async ({ page }) => {
  await page.clock.install();
  let unavailable = true;
  let probes = 0;
  await page.route('**/api/me', async (route) => {
    probes += 1;
    if (unavailable) await route.fulfill({ status: 503, body: '{}' }); else await route.continue();
  });
  await page.goto('/');
  await expect(page.getByText('Connecting to server…').first()).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1_000)));
  await page.clock.runFor(90_000);
  await expect(page.getByText('Server unavailable. Please try again.').first()).toBeVisible();
  const stoppedAt = probes;
  await page.clock.runFor(60_000); expect(probes).toBe(stoppedAt);
  unavailable = false;
  const retry = page.getByRole('button', { name: 'Retry' }).first();
  await retry.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('offline recovery sends no probes, resumes once, and never extends the deadline', async ({ page, context }) => {
  await page.clock.install();
  let probes = 0;
  await page.route('**/api/me', async (route) => { probes += 1; await route.fulfill({ status: 503, body: '{}' }); });
  await page.goto('/');
  await expect(page.getByText('Connecting to server…').first()).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1_000)));
  await context.setOffline(true);
  await expect(page.getByText('You’re offline. Reconnect to continue.').first()).toBeVisible();
  const beforeOffline = probes;
  await page.clock.runFor(30_000); expect(probes).toBe(beforeOffline);
  await context.setOffline(false);
  await expect.poll(() => probes).toBe(beforeOffline + 1);
  await expect(page.getByRole('button', { name: 'Retry' }).first()).toBeEnabled();
  await context.setOffline(true); await page.clock.runFor(60_000); await context.setOffline(false);
  await expect(page.getByText('Server unavailable. Please try again.').first()).toBeVisible();
  expect(probes).toBe(beforeOffline + 1);
});

test('hidden recovery pauses probes and resumes within the original budget', async ({ page }) => {
  await page.clock.install();
  let probes = 0;
  await page.route('**/api/me', async (route) => { probes += 1; await route.fulfill({ status: 503, body: '{}' }); });
  await page.goto('/');
  await expect(page.getByText('Connecting to server…').first()).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1_000)));
  const setHidden = async (hidden: boolean) => page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: value ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await setHidden(true);
  const beforeHidden = probes;
  await page.clock.runFor(30_000); expect(probes).toBe(beforeHidden);
  await setHidden(false); await expect.poll(() => probes).toBe(beforeHidden + 1);
  await expect(page.getByRole('button', { name: 'Retry' }).first()).toBeEnabled();
  await setHidden(true); await page.clock.runFor(60_000); await setHidden(false);
  await expect(page.getByText('Server unavailable. Please try again.').first()).toBeVisible();
  expect(probes).toBe(beforeHidden + 1);
});

test('a backend restart returns an authenticated participant to the lobby with a clear interruption', async ({ browser, request }) => {
  test.setTimeout(45_000);
  const context = await browser.newContext();
  try {
    await createAccountThroughNativeApi(context, {
      displayName: 'Restart Alice',
      email: `restart-${Date.now()}@example.test`,
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Room' }).click();
    await page.getByLabel('Room title').fill('Restart table');
    await page.getByRole('button', { name: 'Create private room' }).click();
    await expect(page).toHaveURL(/\/rooms\/[^/]+$/);

    const restart = await request.post('/__e2e/restart-backend', { data: { delayMs: 250 } });
    expect(restart.ok(), await restart.text()).toBe(true);

    try {
      await expect(page).toHaveURL('http://127.0.0.1:3100/');
    } catch (error) {
      // Keep the acceptance bound; capture only fixed states and HTTP status on failure.
      const sessionStatus = await context.request.get('/api/me', { timeout: 1_000 })
        .then((response) => response.status()).catch(() => null);
      console.error('Restart acceptance diagnostics', {
        sessionStatus,
        unavailable: await page.getByText('Service unavailable', { exact: true }).count(),
        reconnecting: await page.getByText('Reconnecting', { exact: true }).count(),
      });
      throw error;
    }
    await expect(page.getByText('The game server restarted, so the previous room was closed.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Restart table' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
