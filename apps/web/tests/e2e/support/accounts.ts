import { expect, type BrowserContext, type Page } from '@playwright/test';

export const registrationCode = 'E2E-PRIVATE-CODE';

export async function readAccountEmail(context: BrowserContext, recipient: string, kind: 'verification' | 'reset') {
  let url = '';
  await expect.poll(async () => {
    const response = await context.request.get(`/__e2e/account-email?recipient=${encodeURIComponent(recipient)}&kind=${kind}`);
    if (!response.ok()) return false;
    const body = await response.json() as { url?: string };
    url = body.url ?? '';
    return Boolean(url);
  }).toBe(true);
  return url;
}

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
  await expect(dialog.getByRole('status')).toContainText('Check your email');
  await page.goto(await readAccountEmail(page.context(), account.email, 'verification'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Email').fill(account.email);
  await page.getByRole('dialog').getByLabel('Password').fill('private-test-password');
  await page.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
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
  await context.request.get(await readAccountEmail(context, account.email, 'verification'));
  const signin = await context.request.post('/api/auth/sign-in/email', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: { email: account.email, password: 'private-test-password' },
  });
  expect(signin.ok(), await signin.text()).toBe(true);
}
