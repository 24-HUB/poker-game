import { expect, test } from '@playwright/test';
import { createAccount } from './support/accounts';

test('waiting recovery and active navigation use the real caller membership and deliberate leave', async ({ browser }) => {
  test.setTimeout(90_000);
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const host = await hostContext.newPage();
    await host.goto('/');
    await createAccount(host, { displayName: 'Recovery Host', email: `recovery-host-${suffix}@example.test` });
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Recovery table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await expect(host.getByRole('heading', { name: 'Recovery table' })).toBeVisible();
    const roomUrl = host.url();
    await host.getByRole('button', { name: 'Copy invite code' }).click();
    const invitation = await host.evaluate(() => navigator.clipboard.readText());
    await host.goto('/');
    await expect(host.getByRole('link', { name: 'Return to room' })).toBeVisible();
    await host.getByRole('link', { name: 'Return to room' }).click();
    const guest = await guestContext.newPage();
    await guest.goto('/#invite=' + encodeURIComponent(invitation));
    await createAccount(guest, { displayName: 'Recovery Guest', email: `recovery-guest-${suffix}@example.test` });
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Use this tab to play' }).click();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(host.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await host.goto('/collection');
    await expect(host).toHaveURL(roomUrl);
    await expect(host.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await host.reload();
    await expect(host).toHaveURL(roomUrl);
    await expect(host.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await host.goBack();
    await expect(host).toHaveURL(roomUrl);
    await expect(guest.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await expect(guest.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    guest.once('dialog', (dialog) => void dialog.dismiss());
    await guest.getByRole('button', { name: 'Lobby', exact: true }).click();
    await expect(guest.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await guest.getByLabel('Room options', { exact: true }).click();
    guest.once('dialog', (dialog) => void dialog.accept());
    await guest.getByRole('button', { name: 'Collection', exact: true }).click();
    await expect(guest).toHaveURL(/\/collection$/);
    await expect(guest.getByRole('heading', { name: 'Collection', exact: true })).toBeVisible();
    // The left seat remains in the hand; normal timeout/settlement ends the session.
    await host.getByRole('button', { name: 'Use this tab to play' }).click();
    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByLabel('Room options', { exact: true }).click();
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await host.getByRole('button', { name: 'Fold' }).click();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 40_000 });
    await host.goto('/collection');
    await expect(host).toHaveURL(/\/collection$/);
  } finally { await hostContext.close(); await guestContext.close(); }
});
