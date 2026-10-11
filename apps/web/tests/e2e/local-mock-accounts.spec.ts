import { expect, test } from '@playwright/test';

test('local mock helper rejects missing/invalid origins and unknown player selectors', async ({ request }) => {
  expect((await request.post('/__e2e/mock-login', { data: { player: 'host' } })).status()).toBe(403);
  expect((await request.post('/__e2e/mock-login', { headers: { origin: 'http://localhost:3100' }, data: { player: 'host' } })).status()).toBe(403);
  expect((await request.post('/__e2e/mock-login', { headers: { origin: 'http://127.0.0.1:3100' }, data: { player: 'unknown' } })).status()).toBe(400);
});

test('two ready players use real distinct verified sessions and join by invite code', async ({ browser }) => {
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();
    for (const [page, name] of [[host, 'Mock Host'], [guest, 'Mock Guest']] as const) {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.getByRole('button', { name: `Play as ${name}` }).click();
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
    await guest.getByRole('button', { name: 'Use this tab to play' }).click();
    await guest.getByRole('button', { name: 'Leave room', exact: true }).click();
    await guest.getByRole('button', { name: 'Sign out' }).click();
    await guest.getByRole('button', { name: 'Sign in', exact: true }).click();
    await guest.getByRole('button', { name: 'Play as Mock Guest' }).click();
    await expect(guest.getByRole('button', { name: 'Sign out' })).toBeVisible();
    expect((await (await guestContext.request.get('/api/me')).json()).data.accountId).toBe(guestIdentity.accountId);
  } finally { await hostContext.close(); await guestContext.close(); }
});
