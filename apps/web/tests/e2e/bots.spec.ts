import { expect, test } from '@playwright/test';
import { handHistorySchema } from '@poker/contracts';
import { createAccount } from './support/accounts';

test.use({ actionTimeout: 15000 });

test('solo practice bots, results and roster editing preserve later human-only ticket rewards', async ({ browser }) => {
  test.setTimeout(120000);
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const guestContext = await browser.newContext();
  try {
    const suffix = crypto.randomUUID();
    const host = await hostContext.newPage();
    await host.goto('/');
    await createAccount(host, { displayName: 'Bot Host', email: `bot-host-${suffix}@example.test` });
    await host.getByRole('button', { name: 'Create Room', exact: true }).click();
    await host.getByLabel('Room title').fill('Practice table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await expect(host.getByRole('heading', { name: 'Practice table' })).toBeVisible();
    const invitation = await host.getByLabel('Invite code', { exact: true }).inputValue();
    for (let seat = 2; seat <= 6; seat += 1) {
      await host.getByRole('button', { name: `Add bot to seat ${seat}`, exact: true }).click();
      await expect(host.getByRole('button', { name: `Remove Bot ${seat - 1}`, exact: true })).toBeVisible();
    }
    await expect(host.getByText('Practice · No tickets', { exact: true })).toBeVisible();
    await host.screenshot({ path: 'test-results/bots-desktop-roster.png', fullPage: true });
    await host.setViewportSize({ width: 360, height: 800 });
    await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await host.screenshot({ path: 'test-results/bots-mobile-roster.png', fullPage: true });
    for (let bot = 5; bot >= 2; bot -= 1) {
      await host.getByRole('button', { name: `Remove Bot ${bot}`, exact: true }).click();
      await expect(host.getByRole('button', { name: `Remove Bot ${bot}`, exact: true })).toHaveCount(0);
    }
    await host.getByRole('button', { name: 'Start poker session' }).click();
    const table = host.getByRole('region', { name: 'Poker table', exact: true });
    await expect(table).toBeVisible();
    await expect(table.getByText('Practice · No tickets', { exact: true })).toBeVisible();
    await expect(table.getByLabel('Hidden cards', { exact: true })).toHaveCount(1);
    await host.screenshot({ path: 'test-results/bots-mobile-table.png', fullPage: true });
    await host.setViewportSize({ width: 1440, height: 1000 });
    await host.screenshot({ path: 'test-results/bots-desktop-table.png', fullPage: true });
    await host.getByLabel('Room options', { exact: true }).click();
    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await host.getByLabel('Room options', { exact: true }).click();
    await table.getByRole('button', { name: /^Call/ }).click();
    await expect(table.getByText('Thinking…', { exact: true })).toBeVisible();
    await expect(table.getByRole('button', { name: 'Fold', exact: true })).toBeEnabled({ timeout: 10000 });
    await table.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(table.getByText('Practice hand · No tickets earned.', { exact: true })).toBeVisible();
    await expect(host.getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10000 });
    await host.reload();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible();
    await host.getByRole('button', { name: 'Use this tab to play' }).click();
    const responsePromise = host.waitForResponse((response) => response.url().includes('/hands?'), { timeout: 15000 });
    await host.getByRole('button', { name: 'Hand history', exact: true }).click();
    const response = await responsePromise;
    const body = await response.json();
    expect(response.ok()).toBe(true);
    const history = handHistorySchema.parse(body.data);
    expect(history.hands[0]?.mode).toBe('practice');
    expect(history.hands[0]?.presentation?.participants.some((player) => player.kind === 'bot')).toBe(true);
    expect(history.hands[0]?.rewardReceipts).toBeUndefined();
    await expect(host.getByRole('region', { name: 'Completed hands' }).getByText('Practice hand · No tickets earned.', { exact: true })).toBeVisible();
    await host.getByRole('button', { name: 'Manage seats' }).click();
    await host.getByRole('button', { name: 'Remove Bot 1', exact: true }).click();
    await expect(host.getByText('Practice · No tickets', { exact: true })).toHaveCount(0);
    const guest = await guestContext.newPage();
    await guest.goto('/#invite=' + encodeURIComponent(invitation));
    await createAccount(guest, { displayName: 'Human Guest', email: `bot-guest-${suffix}@example.test` });
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(table).toBeVisible();
    await expect(table.getByText('Practice · No tickets', { exact: true })).toHaveCount(0);
    await host.getByLabel('Room options', { exact: true }).click();
    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await host.getByLabel('Room options', { exact: true }).click();
    await table.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(host.getByText('+1 ticket earned', { exact: true })).toBeVisible();
    await expect(host.getByLabel('1 tickets, 19 can be earned today')).toBeVisible();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10000 });
  } finally { await Promise.allSettled([hostContext.close(), guestContext.close()]); }
});

test('mixed human/bot practice keeps controls private through tab takeover and reload', async ({ browser }) => {
  test.setTimeout(90000);
  const hostContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const guestContext = await browser.newContext();
  try {
    const suffix = crypto.randomUUID();
    const host = await hostContext.newPage(); await host.goto('/');
    await createAccount(host, { displayName: 'Mixed Host', email: `mixed-host-${suffix}@example.test` });
    await host.getByRole('button', { name: 'Create Room', exact: true }).click();
    await host.getByLabel('Room title').fill('Mixed practice');
    await host.getByRole('button', { name: 'Create private room' }).click();
    const invitation = await host.getByLabel('Invite code', { exact: true }).inputValue();
    const guest = await guestContext.newPage(); await guest.goto('/#invite=' + encodeURIComponent(invitation));
    await createAccount(guest, { displayName: 'Mixed Guest', email: `mixed-guest-${suffix}@example.test` });
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Add bot to seat 3', exact: true }).click();
    await expect(guest.getByText('Practice · No tickets', { exact: true })).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Remove Bot 1' })).toHaveCount(0);
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(guest.getByRole('region', { name: 'Poker table', exact: true })).toBeVisible();
    const observer = await hostContext.newPage(); await observer.goto(host.url());
    await observer.getByRole('button', { name: 'Use this tab to play' }).click();
    await expect(host.getByRole('button', { name: 'Fold', exact: true })).toBeDisabled();
    await observer.reload();
    await observer.getByRole('button', { name: 'Use this tab to play' }).click();
    await expect(observer.getByLabel('Your cards', { exact: true })).toBeVisible();
    await observer.getByLabel('Room options', { exact: true }).click();
    observer.once('dialog', (dialog) => void dialog.accept());
    await observer.getByRole('button', { name: 'End after this hand' }).click();
    await observer.getByLabel('Room options', { exact: true }).click();
    await observer.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(guest.getByRole('button', { name: 'Fold', exact: true })).toBeEnabled();
    await guest.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(observer.getByText('Practice hand · No tickets earned.', { exact: true })).toBeVisible();
    await expect(guest.getByText('Practice hand · No tickets earned.', { exact: true })).toBeVisible();
    await expect(observer.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10000 });
    await expect(observer.getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
    await expect(guest.getByLabel('0 tickets, 20 can be earned today')).toBeVisible();
    await expect.poll(() => observer.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await observer.screenshot({ path: 'test-results/bots-mobile-mixed-results.png', fullPage: true });
  } finally { await Promise.allSettled([hostContext.close(), guestContext.close()]); }
});
