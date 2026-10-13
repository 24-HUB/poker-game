import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// These generated credentials also serve manual playtesting; do not retain them in traces.
test.use({ trace: 'off' });

test('local account credentials and shortcut login are never served over HTTP', async ({ request }) => {
  expect((await request.post('/__e2e/mock-login', { headers: { origin: 'http://127.0.0.1:3100' }, data: { player: 'host' } })).status()).toBe(404);
  expect((await request.get('/__e2e/mock-accounts')).status()).toBe(404);
  expect((await request.get('/.artifacts/local-test-accounts.json')).status()).toBe(404);
});

test('two ready players use real distinct verified sessions and join by invite code', async ({ browser }) => {
  const accounts = JSON.parse(await readFile(resolve(process.cwd(), '.artifacts/local-test-accounts.json'), 'utf8')) as Record<'host' | 'guest', { email: string; password: string }>;
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();
    for (const [page, player] of [[host, 'host'], [guest, 'guest']] as const) {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page.getByRole('button', { name: /Play as Mock/ })).toHaveCount(0);
      await page.getByRole('dialog').getByLabel('Email', { exact: true }).fill(accounts[player].email);
      await page.getByRole('dialog').getByLabel('Password', { exact: true }).fill(accounts[player].password);
      await page.getByRole('button', { name: 'Sign in to your club' }).click();
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    }
    const hostIdentity = (await (await hostContext.request.get('/api/me')).json()).data;
    const guestIdentity = (await (await guestContext.request.get('/api/me')).json()).data;
    expect(hostIdentity.displayName).toBe('Mock Host');
    expect(guestIdentity.displayName).toBe('Mock Guest');
    expect(hostIdentity.accountId).not.toBe(guestIdentity.accountId);
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Mock table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await host.getByRole('button', { name: 'Copy invite code' }).click();
    const code = await host.evaluate(() => navigator.clipboard.readText());
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await guest.getByRole('button', { name: 'Join Room' }).click();
    await guest.getByLabel('Invite code').fill(` ${code} `);
    await guest.getByRole('button', { name: 'Join private room' }).click();
    await expect(guest.getByRole('heading', { name: 'Mock table' })).toBeVisible();
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await guest.getByRole('button', { name: 'Leave room', exact: true }).click();
    await guest.getByRole('button', { name: 'Sign out' }).click();
    await guest.getByRole('button', { name: 'Sign in', exact: true }).click();
    await guest.getByRole('dialog').getByLabel('Email', { exact: true }).fill(accounts.guest.email);
    await guest.getByRole('dialog').getByLabel('Password', { exact: true }).fill(accounts.guest.password);
    await guest.getByRole('button', { name: 'Sign in to your club' }).click();
    await expect(guest.getByRole('button', { name: 'Sign out' })).toBeVisible();
    expect((await (await guestContext.request.get('/api/me')).json()).data.accountId).toBe(guestIdentity.accountId);
  } finally { await hostContext.close(); await guestContext.close(); }
});
