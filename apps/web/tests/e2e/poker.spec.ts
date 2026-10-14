import { expect, test } from '@playwright/test';
import { handHistorySchema } from '@poker/contracts';

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
    await host.getByRole('button', { name: 'Copy invite code' }).click();
    const invitation = await host.evaluate(() => navigator.clipboard.readText());
    const guest = await guestContext.newPage();
    await guest.goto('/#invite=' + encodeURIComponent(invitation));
    await createAccount(guest, { displayName: 'Poker Guest', email: `poker-guest-${suffix}@example.test` });
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await expect(host.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Start poker session' })).toBeEnabled();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(host.getByRole('region', { name: 'Poker table' })).toBeVisible().catch(async (error) => {
      console.log('Session start state:', { messages: await host.locator('.room-control-message').allTextContents(),
        guidance: await host.locator('.room-control-guidance').allTextContents(), connection: await host.locator('.connection-state').allTextContents() });
      throw error;
    });
    await expect(guest.getByRole('region', { name: 'Poker table' })).toBeVisible();
    await expect(host.getByLabel('Your cards')).toBeVisible();
    await expect(guest.getByLabel('Your cards')).toBeVisible();
    await host.getByRole('button', { name: 'Fold' }).click();
    await expect(host.getByRole('heading', { name: /^Hand \d+ result$/ })).toBeVisible();
    await expect(host.getByText('+1 ticket earned', { exact: true })).toBeVisible();
    await expect(host.getByLabel('1 tickets, 19 can be earned today')).toBeVisible();
    await host.screenshot({ path: 'test-results/m3-desktop-hand-reward.png', fullPage: true });
    await expect(guest.getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
    await expect(host.getByText('Winner: Poker Guest')).toBeVisible();
    await expect(host.getByLabel('Stack: 1010 chips', { exact: true })).toHaveCount(1);
    await expect(host.getByText('Poker Guest is acting')).toBeVisible({ timeout: 10_000 });
    await host.getByLabel('Room options', { exact: true }).click();
    host.once('dialog', (dialog) => void dialog.dismiss());
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await expect(host.getByText('The session will end after this hand.')).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'End after this hand' })).toBeEnabled();
    host.once('dialog', (dialog) => void dialog.accept());
    await expect(host.getByRole('button', { name: 'End after this hand' })).toBeEnabled();
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await expect(host.getByText('The session will end after this hand.')).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await expect(guest.getByRole('button', { name: 'Fold' })).toBeEnabled();
    await guest.getByRole('button', { name: 'Fold' }).click();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10_000 });
    await host.reload();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible();
    await expect(host.getByLabel('1 tickets, 19 can be earned today')).toBeVisible();
    await expect(guest.getByLabel('1 tickets, 19 can be earned today')).toBeVisible();
    const historyResponse = host.waitForResponse((response) => response.url().includes('/hands?'));
    await host.getByRole('button', { name: 'Hand history', exact: true }).click();
    const response = await historyResponse;
    const body = await response.json();
    expect(response.ok(), JSON.stringify({ status: response.status(), error: body.error })).toBe(true);
    const parsedHistory = handHistorySchema.safeParse(body.data);
    expect(parsedHistory.success, JSON.stringify(parsedHistory.error?.issues)).toBe(true);
    const history = host.getByRole('region', { name: 'Completed hands' });
    await expect(history.getByRole('heading', { name: 'Hand 2', exact: true })).toBeVisible();
    await expect(history.getByRole('heading', { name: 'Hand 1', exact: true })).toBeVisible();
    await expect(history).toContainText('Winner: Poker Guest');
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
