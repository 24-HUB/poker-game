import { expect, test } from '@playwright/test';

import { createAccountThroughNativeApi } from './support/accounts';

test.describe.configure({ mode: 'serial' });

test('a cold backend is unavailable rather than signed out and recovers on retry', async ({ page, request }) => {
  const restart = await request.post('/__e2e/restart-backend', { data: { delayMs: 2_000 } });
  expect(restart.ok(), await restart.text()).toBe(true);

  await page.goto('/');
  await expect(page.getByText('Server starting')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);

  await expect.poll(async () => (await request.get('/api/me')).status(), { timeout: 15_000 }).toBe(401);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
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

    await expect(page).toHaveURL('http://127.0.0.1:3100/');
    await expect(page.getByText('The game server restarted, so the previous room was closed.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Restart table' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
