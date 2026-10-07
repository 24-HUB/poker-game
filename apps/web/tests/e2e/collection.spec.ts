import { expect, test } from '@playwright/test';
import type { PullReceipt } from '@poker/contracts';
import { createAccountThroughNativeApi } from './support/accounts';

test('earn → interrupted pull → recover → equip → next hand → sign in again', async ({ browser }) => {
  test.setTimeout(180_000);
  const suffix = Date.now();
  const email = `collection-host-${suffix}@example.test`;
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext();
  hostContext.setDefaultTimeout(15_000);
  guestContext.setDefaultTimeout(15_000);
  try {
    await createAccountThroughNativeApi(hostContext, { displayName: 'Celestial Host', email });
    await createAccountThroughNativeApi(guestContext, { displayName: 'Celestial Guest', email: `collection-guest-${suffix}@example.test` });
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();
    await host.goto('/');
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Celestial table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await expect(host.getByRole('heading', { name: 'Celestial table' })).toBeVisible();
    await host.getByRole('button', { name: 'Copy room link' }).click();
    const invitation = await host.evaluate(() => navigator.clipboard.readText());
    const roomUrl = host.url();
    await guest.goto(invitation);
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Claim control in this tab' }).click();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(guest.getByRole('region', { name: 'Poker table' })).toBeVisible();
    for (let i = 0; i < 5; i += 1) {
      const guestClaim = guest.getByRole('button', { name: 'Claim control', exact: true });
      if (await guestClaim.isVisible()) await guestClaim.click();
      const hostFold = host.getByRole('button', { name: 'Fold', exact: true });
      const guestCall = guest.getByRole('button', { name: /^Call / });
      await expect.poll(async () => {
        if (Boolean(await hostFold.count()) && await hostFold.isEnabled()
          || Boolean(await guestCall.count()) && await guestCall.isEnabled()) return 'ready';
        const states = [];
        for (const page of [host, guest]) {
          states.push({
            phase: await page.locator('.poker-table__header > div:first-child > p:last-child').allTextContents(),
            turn: await page.locator('.poker-table__action-panel > [role="status"]').allTextContents(),
            claim: await page.getByRole('button', { name: 'Claim control', exact: true }).count(),
            pending: await page.getByRole('button', { name: 'Reconcile pending game action' }).count(),
          });
        }
        return JSON.stringify(states);
      }, { timeout: 10_000, message: `Waiting for an actor in qualifying hand ${i + 1}` }).toBe('ready');
      if (!await hostFold.count() || !await hostFold.isEnabled()) {
        if (await guestClaim.isVisible()) await guestClaim.click();
        await guest.getByRole('button', { name: /^Call / }).click();
      }
      await expect(host.getByRole('button', { name: 'Fold', exact: true })).toBeEnabled();
      if (i === 4) { host.once('dialog', (dialog) => void dialog.accept()); await host.getByRole('button', { name: 'End after this hand' }).click(); }
      await host.getByRole('button', { name: 'Fold', exact: true }).click();
      await expect(host.getByLabel(`${i + 1} tickets, ${19 - i} can be earned today`)).toBeVisible();
    }
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10_000 });
    await host.goto('/pulls');
    await expect(host.getByRole('button', { name: 'Open 1 — 5 tickets' })).toBeEnabled();
    await host.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Test storage unavailable'); }; });
    await host.getByRole('button', { name: 'Open 1 — 5 tickets' }).click();
    await expect(host.getByRole('alert').filter({ hasText: 'cannot safely save' })).toBeVisible();
    expect((await (await hostContext.request.get('/api/wallet')).json()).data.balance).toBe(5);
    await host.reload();
    await expect(host.getByRole('button', { name: 'Open 1 — 5 tickets' })).toBeEnabled();
    if (process.env.M4_CAPTURE === '1') await host.screenshot({ path: 'test-results/m4-pulls-desktop.png', fullPage: true });
    await host.setViewportSize({ width: 360, height: 800 });
    if (process.env.M4_CAPTURE === '1') await host.screenshot({ path: 'test-results/m4-pulls-mobile.png', fullPage: true });
    expect(await host.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await host.setViewportSize({ width: 1280, height: 850 });

    let captured: PullReceipt | null = null;
    let markCommitted!: () => void;
    let releaseResponse!: () => void;
    const committed = new Promise<void>((resolve) => { markCommitted = resolve; });
    const release = new Promise<void>((resolve) => { releaseResponse = resolve; });
    await host.route('**/api/pulls', async (route) => {
      const response = await route.fetch();
      captured = (await response.json()).data as PullReceipt;
      markCommitted();
      await release;
      await route.fulfill({ response }).catch(() => undefined);
    });
    if (process.env.M4_CAPTURE === '1') { await host.clock.install(); await host.clock.pauseAt(new Date()); }
    await host.getByRole('button', { name: 'Open 1 — 5 tickets' }).click();
    await committed;
    await host.reload();
    releaseResponse();
    await host.unroute('**/api/pulls');
    if (process.env.M4_CAPTURE === '1') {
      // Let hydration and query notifications run while keeping the 900 ms reveal frozen for captures.
      await expect.poll(async () => {
        await host.clock.runFor(50);
        return host.getByRole('heading', { name: 'Your invitations are ready', exact: true }).count();
      }, { timeout: 10_000 }).toBe(1);
      await host.screenshot({ path: 'test-results/m4-reveal-desktop.png', fullPage: true });
      await host.setViewportSize({ width: 360, height: 800 });
      await host.screenshot({ path: 'test-results/m4-reveal-mobile.png', fullPage: true });
      await host.setViewportSize({ width: 1280, height: 850 });
      await host.clock.resume();
    }
    await expect(host.getByRole('heading', { name: 'Your invitations', exact: true })).toBeVisible();
    expect(captured).not.toBeNull();
    const receipt = captured! as PullReceipt;
    const recovered = await (await hostContext.request.get(`/api/pulls/${receipt.requestId}`)).json();
    expect(recovered.data).toEqual(receipt);
    expect((await (await hostContext.request.get('/api/wallet')).json()).data.balance).toBe(0);
    const item = receipt.results[0]!.item;
    await expect(host.getByRole('heading', { name: item.name, exact: true }).first()).toBeVisible();
    await host.getByRole('button', { name: 'Continue', exact: true }).click();
    await host.goto('/collection');
    if (item.slot === 'cardBack') await host.getByRole('tab', { name: 'Card backs' }).click();
    await host.locator('.cosmetic-choice').filter({ has: host.getByRole('heading', { name: item.name, exact: true }) }).click();
    await host.getByRole('button', { name: item.slot === 'avatar' ? 'Equip avatar' : 'Equip card back', exact: true }).click();
    await expect(host.getByRole('status')).toContainText('Selection saved');
    if (process.env.M4_CAPTURE === '1') await host.screenshot({ path: 'test-results/m4-collection-desktop.png', fullPage: true });
    await host.setViewportSize({ width: 360, height: 800 });
    if (process.env.M4_CAPTURE === '1') await host.screenshot({ path: 'test-results/m4-collection-mobile.png', fullPage: true });
    expect(await host.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await host.locator('.cosmetic-choice').last().click();
    await expect(host.getByRole('complementary', { name: 'Equipment preview' })).toBeInViewport();
    await expect(host.getByRole('complementary', { name: 'Equipment preview' })).toBeFocused();
    await host.getByRole('tab', { name: item.slot === 'avatar' ? 'Avatars' : 'Card backs' }).focus();
    await host.keyboard.press('ArrowRight');
    await expect(host.getByRole('tab', { name: item.slot === 'avatar' ? 'Card backs' : 'Avatars' })).toHaveAttribute('aria-selected', 'true');
    await host.setViewportSize({ width: 1280, height: 850 });
    await host.goto(roomUrl);
    await expect(host.getByRole('region', { name: 'Poker table' })).toBeVisible();
    const claim = host.getByRole('button', { name: 'Claim control', exact: true });
    if (await claim.isVisible()) await claim.click();
    // Navigating away transferred host control to the guest who stayed at the table.
    const guestControl = guest.getByRole('button', { name: 'Claim control', exact: true });
    if (await guestControl.isVisible()) await guestControl.click();
    await guest.getByRole('button', { name: 'Start new session' }).click();
    const observer = item.slot === 'avatar' ? host : guest;
    await expect(observer.locator(`.poker-seat img[src="${item.assetUrl}"]`)).toHaveCount(item.slot === 'avatar' ? 1 : 2);
    const cards = await host.getByLabel('Your cards').innerText();
    expect(cards).not.toContain(item.name);
    await host.getByRole('button', { name: 'Sign out' }).click();
    await host.goto('/collection');
    await host.getByRole('button', { name: 'Sign in', exact: true }).click();
    await host.getByRole('dialog').getByLabel('Email').fill(email);
    await host.getByRole('dialog').getByLabel('Password').fill('private-test-password');
    await host.getByRole('button', { name: 'Sign in to your club' }).click();
    await expect(host.getByRole('button', { name: 'Sign out' })).toBeVisible();
    const equipment = await (await hostContext.request.get('/api/equipment')).json();
    expect(equipment.data[item.slot].itemId).toBe(item.id);
    await expect(host.getByRole('heading', { name: 'Collection', exact: true })).toBeVisible();
  } finally { await hostContext.close(); await guestContext.close(); }
});
