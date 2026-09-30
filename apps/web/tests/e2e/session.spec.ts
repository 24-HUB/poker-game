import { expect, test } from '@playwright/test';

test('a confirmed signed-out response opens the accessible account dialog', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } }),
  }));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Sign in' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Email')).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const closeButton = dialog.getByRole('button', { name: 'Close sign-in' });
  await closeButton.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Resend verification' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('an unavailable backend is not presented as a signed-out session', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/');

  await expect(page.getByText('Server starting')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeHidden();
});
