import { expect, test } from '@playwright/test';

import { createAccount } from './support/accounts';

test('heads-up hands carry chips and the host ends after a committed hand', async ({ browser }) => {
  test.setTimeout(90_000);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    await host.goto('/');
    await createAccount(host, { displayName: 'Poker Host', email: `poker-host-${suffix}@example.test` });
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('M2 table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await expect(host.getByRole('heading', { name: 'M2 table' })).toBeVisible();
    await host.getByRole('button', { name: 'Copy room link' }).click();
    const invitation = await host.evaluate(() => navigator.clipboard.readText());
    const guest = await guestContext.newPage();
    await guest.goto(invitation);
    await createAccount(guest, { displayName: 'Poker Guest', email: `poker-guest-${suffix}@example.test` });
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Claim control in this tab' }).click();
    await expect(host.getByRole('button', { name: 'Claim control in this tab' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Start poker session' })).toBeEnabled();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(host.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await expect(guest.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await expect(host.getByLabel('Your cards')).toBeVisible();
    await expect(guest.getByLabel('Your cards')).toBeVisible();
    await host.getByRole('button', { name: 'Fold' }).click();
    await expect(host.getByRole('heading', { name: 'Hand result' })).toBeVisible();
    await expect(host.getByText('Winner: Poker Guest')).toBeVisible();
    await expect(host.getByText('1010 chips · bet 20')).toHaveCount(1);
    await expect(host.getByText(/Turn: Poker Guest/)).toBeVisible({ timeout: 10_000 });
    await expect(host.getByRole('button', { name: 'End after this hand' })).toBeEnabled();
    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await expect(host.getByText('The session will end after this hand.')).toBeVisible();
    await guest.getByRole('button', { name: 'Claim control' }).click();
    await expect(guest.getByRole('button', { name: 'Fold' })).toBeEnabled();
    await guest.getByRole('button', { name: 'Fold' }).click();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10_000 });
    await host.reload();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
