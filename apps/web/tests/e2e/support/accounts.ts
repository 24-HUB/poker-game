import { expect, type BrowserContext, type Page } from '@playwright/test';

export const registrationCode = 'E2E-PRIVATE-CODE';

export async function createAccount(page: Page, account: { displayName: string; email: string }) {
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await dialog.getByLabel('Display name').fill(account.displayName);
  await dialog.getByLabel('Email').fill(account.email);
  await dialog.getByLabel('Password').fill('private-test-password');
  await dialog.getByLabel('Registration code').fill(registrationCode);
  await dialog.getByRole('button', { name: 'Create private account' }).click();
  await expect(page.getByText(account.displayName, { exact: true })).toBeVisible();
}

export async function createAccountThroughNativeApi(
  context: BrowserContext,
  account: { displayName: string; email: string },
) {
  const response = await context.request.post('/api/auth/sign-up/email', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: {
      name: account.displayName,
      email: account.email,
      password: 'private-test-password',
      registrationCode,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
