import { expect, test } from '@playwright/test';
import { createAccount, prepareFixtureClient, readAccountEmail, registrationCode } from './support/accounts';

test('verified account resets with a code on mobile, retains wallet, rejects reuse and old password', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const account = { displayName: 'Recoverable friend', email: `recovery-${Date.now()}@example.com` };
  let release!: () => void;
  const accessCheck = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/rooms/current', async (route) => { await accessCheck; await route.continue(); });
  await page.goto('/'); await createAccount(page, account);
  try {
    await expect(page.getByText('Recovering your current room…')).toBeVisible();
    await expect(page.getByRole('status').getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
  await expect(page.getByRole('banner').getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click(); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Forgot password?' }).click();
  await dialog.getByLabel('Email', { exact: true }).fill(account.email);
  await dialog.getByRole('button', { name: 'Send reset code' }).click();
  await expect(dialog.getByRole('status')).toContainText('If that address has an account');
  const code = await readAccountEmail(page.context(), account.email, 'reset');
  await dialog.getByLabel('Email code').fill(code);
  await dialog.getByLabel('New password', { exact: true }).fill('changed-private-password');
  await dialog.getByLabel('Confirm new password').fill('different-private-password');
  await dialog.getByRole('button', { name: 'Change password' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Passwords do not match');
  await dialog.getByLabel('Confirm new password').fill('changed-private-password');
  await dialog.getByRole('button', { name: 'Change password' }).click();
  await expect(dialog.getByRole('status')).toContainText('Password changed. All previous sessions');
  await expect(dialog.getByLabel('Email')).toHaveValue(account.email);
  await expect(dialog.getByLabel('Password')).toHaveValue('');
  expect((await page.context().request.get('/api/me')).status()).toBe(401);
  const reused = await page.context().request.post('/api/auth/email-otp/reset-password', {
    headers: { origin: 'http://127.0.0.1:3100' }, data: { email: account.email, otp: code, password: 'another-private-password' },
  }); expect(reused.status()).toBe(400);
  await dialog.getByLabel('Password').fill('private-test-password'); await dialog.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(dialog.getByRole('alert')).toContainText('did not match');
  await dialog.getByLabel('Password').fill('changed-private-password'); await dialog.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(page.getByRole('banner').getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Layout screenshots only after secrets have been removed from the DOM.
  await page.screenshot({ path: 'test-results/email-codes-mobile-signed-in.png', fullPage: true });
});

test('unverified account can enter an existing code and use keyboard navigation without automatic login', async ({ page }) => {
  await prepareFixtureClient(page.context()); const email = `unverified-${Date.now()}@example.com`;
  const signup = await page.context().request.post('/api/auth/sign-up/email', {
    headers: { origin: 'http://127.0.0.1:3100' }, data: { name: 'Unverified friend', email, password: 'private-test-password', registrationCode },
  }); expect(signup.ok()).toBe(true);
  await page.goto('/'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByLabel('Email').fill(email); await dialog.getByLabel('Password').fill('private-test-password');
  await dialog.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(dialog.getByLabel('Email code')).toBeFocused();
  await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue(email);
  await dialog.getByLabel('Email code').fill(await readAccountEmail(page.context(), email, 'verification'));
  await dialog.getByRole('button', { name: 'Verify email' }).click();
  await expect(dialog.getByRole('status')).toContainText('Email verified'); expect((await page.context().request.get('/api/me')).status()).toBe(401);
  await dialog.getByRole('button', { name: 'Close sign-in' }).focus(); await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Resend verification' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload(); await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});

test('public reset page works without a token and strips old-link secrets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reset-password?token=retired-secret&error=old');
  await expect(page.getByRole('status').filter({ hasText: 'This link has been replaced' })).toBeVisible(); await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByRole('button', { name: 'Send reset code' })).toBeVisible();
  await page.getByRole('button', { name: 'I already have a code' }).click(); await expect(page.getByLabel('Email code')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/email-codes-desktop-reset-empty.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 480 });
  await page.getByLabel('New password', { exact: true }).focus();
  await expect(page.getByLabel('New password', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Change password' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Change password' })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/email-codes-mobile-reset-empty.png', fullPage: true });
  await page.getByLabel('Email', { exact: true }).fill('refresh@example.com');
  await page.getByRole('button', { name: 'I already have a code' }).click();
  await page.getByLabel('Email code').fill('000000'); await page.getByLabel('New password', { exact: true }).fill('transient-test-password');
  await page.reload(); await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'I already have a code' }).click();
  await expect(page.getByLabel('Email code')).toHaveValue(''); await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
  await page.goto('/api/auth/verify-email?token=retired-secret'); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('This link has been replaced'); await expect(page).toHaveURL(/\/$/);
});

test('resend replaces the old verification code and recovers through the latest code', async ({ page }) => {
  test.setTimeout(100_000);
  await prepareFixtureClient(page.context()); const email = `resend-${Date.now()}@example.com`;
  expect((await page.context().request.post('/api/auth/sign-up/email', {
    headers: { origin: 'http://127.0.0.1:3100' }, data: { name: 'Resend friend', email, password: 'private-test-password', registrationCode },
  })).ok()).toBe(true);
  const oldCode = await readAccountEmail(page.context(), email, 'verification');
  await page.goto('/'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Resend verification' }).click();
  await dialog.getByLabel('Email', { exact: true }).fill(email); await dialog.getByRole('button', { name: 'Resend code', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Please wait');
  await expect(dialog.getByRole('button', { name: /^Resend code/ })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Resend code', exact: true })).toBeEnabled({ timeout: 70_000 });
  await dialog.getByRole('button', { name: 'Resend code', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Use the latest email');
  await dialog.getByLabel('Email code').fill(oldCode); await dialog.getByRole('button', { name: 'Verify email' }).click();
  await expect(dialog.getByRole('alert')).toContainText('invalid, expired, replaced or exhausted');
  await dialog.getByLabel('Email code').fill(await readAccountEmail(page.context(), email, 'verification'));
  await dialog.getByRole('button', { name: 'Verify email' }).click(); await expect(dialog.getByRole('status')).toContainText('Email verified');
});

test('unverified account resets through the public page and then signs in with the retained email', async ({ page }) => {
  await prepareFixtureClient(page.context()); const email = `unverified-reset-${Date.now()}@example.com`;
  expect((await page.context().request.post('/api/auth/sign-up/email', {
    headers: { origin: 'http://127.0.0.1:3100' }, data: { name: 'Reset friend', email, password: 'private-test-password', registrationCode },
  })).ok()).toBe(true);
  await page.goto('/reset-password'); await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await page.getByLabel('Email code').fill(await readAccountEmail(page.context(), email, 'reset'));
  await page.getByLabel('New password', { exact: true }).fill('new-private-test-password'); await page.getByLabel('Confirm new password').fill('new-private-test-password');
  await page.getByRole('button', { name: 'Change password' }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue(email);
  expect((await page.context().request.get('/api/me')).status()).toBe(401);
  await dialog.getByLabel('Password', { exact: true }).fill('new-private-test-password'); await dialog.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});
