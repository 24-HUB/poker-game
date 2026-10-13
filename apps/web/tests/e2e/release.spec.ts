import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { createAccountThroughNativeApi } from './support/accounts';

// Both flows share the harness's one-session admission limit.
test.describe.configure({ mode: 'serial' });

async function actingPage(pages: Page[]): Promise<Page> {
  let actor: Page | undefined;
  try {
    await expect.poll(async () => {
      // Read presence and enabled state together: another snapshot can remove
      // the button between a count() and an isEnabled() locator call.
      const active = await Promise.all(pages.map((page) =>
        page.getByRole('button', { name: 'Fold', exact: true })
          .evaluateAll((buttons) => buttons.some((button) => !(button as HTMLButtonElement).disabled))));
      actor = pages[active.indexOf(true)];
      return active.filter(Boolean).length;
    }, { timeout: 10_000 }).toBe(1);
  } catch (error) {
    console.error('Release actor diagnostics', await Promise.all(pages.map(async (page) => ({
      phase: await page.locator('.poker-table__details > p').allTextContents(),
      turn: await page.locator('.poker-turn > [role="status"]').allTextContents(),
      control: await page.getByRole('button', { name: 'Use this tab to play', exact: true }).count(),
      pending: await page.getByRole('button', { name: 'Reconcile pending game action' }).count(),
    }))));
    throw error;
  }
  return actor!;
}

test('six players settle unequal all-ins, preserve chips, and keep mobile cards private', async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  try {
    for (let index = 0; index < 6; index += 1) {
      const context = await browser.newContext({
        permissions: index === 0 ? ['clipboard-read', 'clipboard-write'] : [],
        reducedMotion: 'reduce',
        viewport: index === 0 ? { width: 360, height: 800 } : { width: 1440, height: 1000 },
      });
      contexts.push(context);
      await createAccountThroughNativeApi(context, {
        displayName: index === 3 ? 'Alexandria Through the Looking Glass' : `Release Player ${index + 1}`, email: `release-${index}-${suffix}@example.test`,
      });
      pages.push(await context.newPage());
    }
    const host = pages[0]!;
    await host.goto('/');
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Release acceptance');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await host.getByRole('button', { name: 'Copy invite code' }).click();
    const invitation = await host.evaluate(() => navigator.clipboard.readText());
    for (const page of pages.slice(1)) {
      await page.goto('/#invite=' + encodeURIComponent(invitation));
      await expect(page).toHaveURL(/\/rooms\/[^/]+$/);
      await expect(page.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    }
    await expect(host.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await expect(host.getByText('6 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    for (const page of pages) {
      await expect(page.getByLabel('Your cards')).toHaveCount(1);
      await expect(page.getByLabel('Hidden cards')).toHaveCount(5);
      await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(6);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(await host.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    async function assertTableVisibility(page: Page) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const felt = await page.locator('.poker-table__felt').boundingBox();
      const actions = await page.getByRole('region', { name: 'Poker actions' }).boundingBox();
      const ownCards = await page.getByLabel('Your cards').boundingBox();
      expect(felt).not.toBeNull(); expect(actions).not.toBeNull(); expect(ownCards).not.toBeNull();
      expect(felt!.y + felt!.height, 'Actions must not cover the table').toBeLessThanOrEqual(actions!.y);
      const height = await page.evaluate(() => innerHeight);
      expect(ownCards!.y + ownCards!.height, 'Private cards fit above the controls').toBeLessThanOrEqual(actions!.y);
      expect(actions!.y + actions!.height, 'Primary controls fit in the viewport').toBeLessThanOrEqual(height);
      const ownBet = page.locator('.poker-seat[data-position="bottom"] .poker-seat__bet');
      const bet = await ownBet.count() ? await ownBet.boundingBox() : null;
      const center = await page.locator('.poker-table__center').boundingBox();
      if (bet) expect(center!.y + center!.height, 'The pot and inward bet do not overlap').toBeLessThanOrEqual(bet.y);
      await expect(page.locator('.poker-seat__avatar')).toHaveCount(6);
      expect(await page.locator('.poker-seat__avatar').evaluateAll((images) => images.every((image) => getComputedStyle(image).display !== 'none'))).toBe(true);
      expect(await page.locator('.poker-seat__markers > span').evaluateAll((labels) => labels.every((label) => parseFloat(getComputedStyle(label).fontSize) >= 12))).toBe(true);
      const controlContrast = await page.locator('.poker-table__actions button, .poker-amount-presets button').evaluateAll((buttons) => {
        const luminance = (colour: string) => colour.match(/\d+/g)!.slice(0, 3).map(Number).map((value) => value / 255)
          .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
          .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
        return buttons.map((button) => {
          const style = getComputedStyle(button);
          const foreground = luminance(style.color), background = luminance(style.backgroundColor);
          return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
        });
      });
      expect(Math.min(...controlContrast), 'Action and preset text, including disabled controls, meets 4.5:1').toBeGreaterThanOrEqual(4.5);
    }
    await assertTableVisibility(host);
    const feltContrast = await host.locator('.poker-table__felt').evaluate((felt) => {
      const luminance = (rgb: number[]) => rgb.map((channel) => channel / 255)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
      const foreground = luminance(getComputedStyle(felt).color.match(/\d+/g)!.map(Number));
      const stops = getComputedStyle(felt).backgroundImage.match(/rgb\([\d,\s]+\)/g)!;
      return Math.min(...stops.map((stop) => {
        const background = luminance(stop.match(/\d+/g)!.map(Number));
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      }));
    });
    expect(feltContrast, 'Felt text contrasts with every gradient stop').toBeGreaterThanOrEqual(4.5);
    if (!process.env.CI) {
      await host.evaluate(() => window.scrollTo(0, 0));
      await pages[1]!.evaluate(() => window.scrollTo(0, 0));
      await host.screenshot({ path: testInfo.outputPath('six-player-mobile.png'), fullPage: true });
      await pages[1]!.screenshot({ path: testInfo.outputPath('six-player-desktop.png'), fullPage: true });
    }
    for (const viewport of [{ width: 1280, height: 720 }, { width: 900, height: 900 }]) {
      await pages[1]!.setViewportSize(viewport);
      await expect.poll(() => pages[1]!.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await assertTableVisibility(pages[1]!);
      if (!process.env.CI) await pages[1]!.screenshot({ path: testInfo.outputPath(`six-player-${viewport.width}.png`), fullPage: true });
    }
    await pages[1]!.setViewportSize({ width: 1440, height: 1000 });
    const firstActor = await actingPage(pages);
    const previousViewport = firstActor.viewportSize()!;
    await firstActor.addStyleTag({ content: 'body { font-family: Arial, sans-serif; }' });
    for (const viewport of [{ width: 355, height: 767 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await firstActor.setViewportSize(viewport);
      await expect(firstActor.getByRole('spinbutton')).toBeVisible();
      await expect(firstActor.getByRole('slider')).toBeVisible();
      await expect(firstActor.getByRole('button', { name: 'Minimum', exact: true })).toBeVisible();
      await assertTableVisibility(firstActor);
      await firstActor.getByRole('spinbutton').fill('1');
      await expect(firstActor.getByText(/Enter a whole-chip amount/)).toBeVisible();
      await assertTableVisibility(firstActor);
      await firstActor.getByRole('button', { name: 'Minimum', exact: true }).click();
      if (!process.env.CI) await firstActor.screenshot({ path: testInfo.outputPath(`audit-own-turn-${viewport.width}.png`), fullPage: true });
    }
    await firstActor.setViewportSize({ width: 360, height: 480 });
    await firstActor.getByRole('spinbutton').focus();
    await firstActor.getByRole('button', { name: 'Minimum', exact: true }).scrollIntoViewIfNeeded();
    await expect(firstActor.getByRole('button', { name: 'Minimum', exact: true })).toBeInViewport();
    await expect.poll(() => firstActor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await firstActor.setViewportSize({ width: 355, height: 767 });
    const ownName = firstActor.locator('.poker-seat[data-position="bottom"] .poker-player-name summary');
    await ownName.focus();
    await firstActor.keyboard.press('Enter');
    const expandedName = await firstActor.locator('.poker-seat[data-position="bottom"] .poker-player-name > span').boundingBox();
    const expandedCards = await firstActor.getByLabel('Your cards').boundingBox();
    expect(expandedName!.y + expandedName!.height, 'Expanded player names must not cover private cards').toBeLessThanOrEqual(expandedCards!.y);
    await ownName.click();
    await expect(firstActor.getByText('(you)', { exact: true })).toBeVisible();
    if (!process.env.CI) await firstActor.screenshot({ path: testInfo.outputPath('six-player-mobile-your-turn.png'), fullPage: true });
    await firstActor.setViewportSize(previousViewport);

    // Real folds create unequal stacks; no fixture changes live account balances.
    for (let index = 0; index < 5; index += 1) {
      const actor = await actingPage(pages);
      await actor.getByRole('button', { name: 'Fold', exact: true }).click();
      await expect(actor.getByRole('list', { name: 'Players' }).getByRole('listitem')
        .filter({ hasText: '(you)' }).getByText('Folded', { exact: false })).toBeVisible();
    }
    await expect(host.getByRole('heading', { name: /^Hand \d+ result$/ })).toBeVisible();
    const actor = await actingPage(pages);
    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByLabel('Room options', { exact: true }).click();
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await expect(host.getByText('The session will end after this hand.')).toBeVisible();
    const raiseInput = actor.getByRole('spinbutton', { name: /Raise to|Bet amount/ });
    const maximum = await raiseInput.getAttribute('max');
    expect(maximum).not.toBeNull();
    await raiseInput.fill(maximum!);
    const raiseButton = actor.getByRole('button', { name: /^Raise to \d+$/, exact: true });
    await raiseInput.press('Tab');
    await expect(actor.getByRole('slider', { name: 'Raise amount' })).toBeFocused();
    await actor.keyboard.press('Tab');
    await expect(actor.getByRole('button', { name: 'Minimum' })).toBeFocused();
    await actor.keyboard.press('Tab');
    await expect(actor.getByRole('button', { name: 'Maximum' })).toBeFocused();
    await actor.keyboard.press('Tab');
    await expect(actor.getByRole('button', { name: '½ pot' })).toBeFocused();
    await actor.keyboard.press('Tab');
    await expect(actor.getByRole('button', { name: 'Pot', exact: true })).toBeFocused();
    await actor.keyboard.press('Tab');
    await expect(actor.getByRole('button', { name: 'All-in' })).toBeFocused();
    await raiseButton.focus();
    await expect(raiseButton).toBeFocused();
    expect(await raiseButton.evaluate((button) => getComputedStyle(button).outlineStyle)).toBe('solid');
    const target = await raiseButton.boundingBox();
    expect(target?.height).toBeGreaterThanOrEqual(44);
    expect(target?.width).toBeGreaterThanOrEqual(44);
    await actor.keyboard.press('Enter');
    for (let index = 0; index < 5; index += 1) {
      const caller = await actingPage(pages);
      await caller.getByRole('button', { name: /^Call / }).click();
      // A covering stack can retain chips after calling a shorter all-in.
      await expect(caller.getByRole('button', { name: 'Fold', exact: true })).toBeDisabled();
    }
    for (const page of pages) {
      await expect(page.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/^Showdown:/)).toBeVisible();
      const chips = await page.locator('.poker-table__result ol li').allTextContents();
      expect(chips).toHaveLength(6);
      expect(chips.reduce((sum, line) => sum + Number(line.match(/: (\d+) chips$/)?.[1]), 0)).toBe(6000);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    // Unequal contributions must produce more than one pot at showdown.
    await expect(host.locator('.poker-table__pot')).toContainText('Side pot 1:');
    if (!process.env.CI) {
      await host.evaluate(() => window.scrollTo(0, 0));
      await pages[1]!.evaluate(() => window.scrollTo(0, 0));
      await host.screenshot({ path: testInfo.outputPath('six-player-mobile-results.png'), fullPage: true });
      await pages[1]!.screenshot({ path: testInfo.outputPath('six-player-desktop-results.png'), fullPage: true });
    }
    await host.reload();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible();
    await expect(host.locator('.poker-table__pot')).toContainText('Side pot 1:');
  } finally {
    for (const context of contexts) await context.close();
  }
});

test('heads-up reconnect restores private cards and takeover removes old-tab betting authority', async ({ browser }) => {
  test.setTimeout(90_000);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  try {
    await createAccountThroughNativeApi(hostContext, { displayName: 'Reconnect Host', email: `release-host-${suffix}@example.test` });
    await createAccountThroughNativeApi(guestContext, { displayName: 'Reconnect Guest', email: `release-guest-${suffix}@example.test` });
    const host = await hostContext.newPage();
    let guest = await guestContext.newPage();
    await host.goto('/');
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Reconnect acceptance');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await host.getByRole('button', { name: 'Copy invite code' }).click();
    await guest.goto('/#invite=' + encodeURIComponent(await host.evaluate(() => navigator.clipboard.readText())));
    await expect(guest.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(guest.getByLabel('Your cards')).toBeVisible();
    const privateCards = await guest.getByLabel('Your cards').textContent();

    const roomUrl = guest.url();
    await guest.close();
    await expect(host.getByRole('list', { name: 'Players' }).getByRole('listitem')
      .filter({ hasText: 'Reconnect Guest' }).getByText('Disconnected', { exact: false })).toBeVisible();
    guest = await guestContext.newPage();
    await guest.goto(roomUrl);
    await expect(guest.getByLabel('Your cards')).toHaveText(privateCards!);
    await expect(guest.getByLabel('Hidden cards')).toHaveCount(1);
    await guest.getByRole('button', { name: 'Use this tab to play', exact: true }).click();
    await expect(guest.getByRole('button', { name: 'Use this tab to play', exact: true })).toHaveCount(0);

    const newTab = await guestContext.newPage();
    await newTab.goto(guest.url());
    await newTab.getByRole('button', { name: 'Use this tab to play', exact: true }).click();
    await expect(newTab.getByRole('button', { name: 'Use this tab to play', exact: true })).toHaveCount(0);
    await expect(guest.getByRole('button', { name: 'Use this tab to play', exact: true })).toBeVisible();
    await host.getByRole('button', { name: /^Call / }).click();
    await expect(newTab.getByRole('button', { name: 'Check', exact: true })).toBeEnabled();
    await expect(guest.getByRole('button', { name: 'Check', exact: true })).toBeDisabled();
    await expect(newTab.getByLabel('Your cards')).toHaveText(privateCards!);

    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByLabel('Room options', { exact: true }).click();
    await host.getByRole('button', { name: 'End after this hand' }).click();
    await expect(host.getByText('The session will end after this hand.')).toBeVisible();
    await newTab.getByRole('button', { name: 'Fold', exact: true }).click();
    for (const page of [host, guest, newTab]) {
      await expect(page.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10_000 });
      const chips = await page.locator('.poker-table__result ol li').allTextContents();
      expect(chips.reduce((sum, line) => sum + Number(line.match(/: (\d+) chips$/)?.[1]), 0)).toBe(2000);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally {
    await guestContext.setOffline(false);
    await hostContext.close();
    await guestContext.close();
  }
});
