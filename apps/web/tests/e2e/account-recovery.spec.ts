import { expect, test } from '@playwright/test';

import { createAccount, readAccountEmail } from './support/accounts';

test('verified account can reset its password and rejects a reused link on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const account = { displayName: 'Recoverable friend', email: `recovery-${Date.now()}@example.com` };
  await page.goto('/');
  await createAccount(page, account);
  await expect(page.getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Forgot password?' }).click();
  await dialog.getByLabel('Email').fill(account.email);
  await dialog.getByRole('button', { name: 'Send reset link' }).click();
  await expect(dialog.getByRole('status')).toContainText('If that address has an account');
  const reset = await readAccountEmail(page.context(), account.email, 'reset');
  await page.goto(reset);
  const tokenUrl = page.url();
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/m3-mobile-recovery.png', fullPage: true });
  await page.getByLabel('New password', { exact: true }).fill('changed-private-password');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('status')).toContainText('Your password has changed');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(tokenUrl);
  await page.getByLabel('New password', { exact: true }).fill('changed-again-password');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Email').fill(account.email);
  await page.getByRole('dialog').getByLabel('Password').fill('changed-private-password');
  await page.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
  await page.screenshot({ path: 'test-results/m3-mobile-wallet.png', fullPage: true });
});
