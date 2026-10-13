import { expect, type BrowserContext, type Page } from '@playwright/test';

export const registrationCode = 'E2E-PRIVATE-CODE';
const fixtureClients = new WeakMap<BrowserContext, string>();
export async function prepareFixtureClient(context: BrowserContext) {
  if (!fixtureClients.has(context)) {
    const identity = crypto.randomUUID(); fixtureClients.set(context, identity);
    await context.setExtraHTTPHeaders({ 'x-e2e-client': identity });
  }
}

export async function readAccountEmail(context: BrowserContext, recipient: string, kind: 'verification' | 'reset') {
  let code = '';
  await expect.poll(async () => {
    const response = await context.request.get(`/__e2e/account-email?recipient=${encodeURIComponent(recipient)}&kind=${kind}`);
    if (!response.ok()) return false;
    const body = await response.json() as { code?: string };
    code = body.code ?? '';
    return /^\d{6}$/.test(code);
  }).toBe(true);
  return code;
}

export async function createAccount(page: Page, account: { displayName: string; email: string }) {
  await prepareFixtureClient(page.context());
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await dialog.getByLabel('Display name').fill(account.displayName);
  await dialog.getByLabel('Email').fill(account.email);
  await dialog.getByLabel('Password').fill('private-test-password');
  await dialog.getByLabel('Registration code').fill(registrationCode);
  await dialog.getByRole('button', { name: 'Create private account' }).click();
  await expect(dialog.getByRole('status')).toContainText('Check your email');
  await dialog.getByLabel('Email code').fill(await readAccountEmail(page.context(), account.email, 'verification'));
  await dialog.getByRole('button', { name: 'Verify email' }).click();
  await expect(dialog.getByRole('status')).toContainText('Email verified');
  await page.getByRole('dialog').getByLabel('Email').fill(account.email);
  await page.getByRole('dialog').getByLabel('Password').fill('private-test-password');
  await page.getByRole('button', { name: 'Sign in to your club' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

export async function createAccountThroughNativeApi(
  context: BrowserContext,
  account: { displayName: string; email: string },
) {
  await prepareFixtureClient(context);
  const response = await context.request.post('/api/auth/sign-up/email', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: {
      name: account.displayName,
      email: account.email,
      password: 'private-test-password',
      registrationCode,
    },
  });
  expect(response.ok()).toBe(true);
  const verified = await context.request.post('/api/auth/email-otp/verify-email', {
    headers: { origin: 'http://127.0.0.1:3100' }, data: { email: account.email, otp: await readAccountEmail(context, account.email, 'verification') },
  });
  expect(verified.ok()).toBe(true);
  const signin = await context.request.post('/api/auth/sign-in/email', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: { email: account.email, password: 'private-test-password' },
  });
  expect(signin.ok()).toBe(true);
}
