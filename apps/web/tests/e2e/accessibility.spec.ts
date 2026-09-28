import { expect, test } from '@playwright/test';

import { createAccountThroughNativeApi } from './support/accounts';

test('mobile lobby keeps named keyboard targets, reduced motion, and long-account overflow bounds', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 360, height: 800 } });
  try {
    await createAccountThroughNativeApi(context, {
      displayName: 'Alexandria Through the Looking Glass',
      email: `accessible-${Date.now()}@example.test`,
    });
    const page = await context.newPage();
    await page.goto('/');

    const create = page.getByRole('button', { name: 'Create Room' });
    await create.focus();
    await expect(create).toBeFocused();
    const target = await create.boundingBox();
    expect(target?.height).toBeGreaterThanOrEqual(44);
    expect(target?.width).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Room title')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(create).toBeFocused();
    await expect(page.getByText('Alexandria Through the Looking Glass', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await context.close();
  }
});
