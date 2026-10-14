import { expect, test, type Page } from '@playwright/test';
import { handHistorySchema } from '@poker/contracts';
import { createAccountThroughNativeApi } from './support/accounts';
test.use({ actionTimeout: 10_000 });

async function endAfterHand(host: Page) {
  await host.getByLabel('Room options', { exact: true }).click();
  host.once('dialog', (dialog) => void dialog.accept());
  await host.getByRole('button', { name: 'End after this hand' }).click();
  await host.getByLabel('Room options', { exact: true }).click();
}

async function inspectLayouts(page: Page, prefix: string) {
  for (const [width, height] of [[1440, 900], [900, 900], [390, 844], [355, 767], [360, 480]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const seats = await page.locator('.poker-seat').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
    }));
    await expect(page.locator('.app-shell')).toHaveClass(/app-shell--playing/);
    for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i]!, b = seats[j]!;
      expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true);
    }
    const cardRows = page.locator('.hand-result__cards');
    const cards = await cardRows.count() ? await cardRows.first().evaluate((element) => {
      const box = element.getBoundingClientRect(); return { right: box.right, width: box.width };
    }) : null;
    if (cards) expect(cards.right).toBeLessThanOrEqual(width!);
    await page.screenshot({ path: `test-results/${prefix}-${width}x${height}.png`, fullPage: true });
  }
}

test('showdown and six-seat flop fold remain readable after session completion and refresh', async ({ browser }) => {
  test.setTimeout(150_000);
  const contexts = [await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' }), await browser.newContext()];
  const suffix = Date.now();
  const pages: Page[] = [];
  try {
    for (let i = 0; i < 2; i++) {
      await createAccountThroughNativeApi(contexts[i]!, { displayName: i === 0 ? 'Alexandria Through the Looking Glass' : 'Showdown Guest', email: `result-${suffix}-${i}@example.test` });
      pages.push(await contexts[i]!.newPage());
    }
    const host = pages[0]!, guest = pages[1]!;
    await host.goto('/');
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Result acceptance');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await host.getByRole('button', { name: 'Copy invite code' }).click();
    const invite = await host.evaluate(() => navigator.clipboard.readText());
    await guest.goto('/#invite=' + encodeURIComponent(invite));
    await expect(host.getByText('2 of 6 members')).toBeVisible();
    await host.getByRole('button', { name: 'Start poker session' }).click();
    await expect(host.getByRole('button', { name: 'Fold' })).toBeEnabled();
    await endAfterHand(host);
    await host.getByRole('button', { name: 'Call 10', exact: true }).click();
    await guest.getByRole('button', { name: 'Check', exact: true }).click();
    for (let street = 0; street < 3; street++) {
      await guest.getByRole('button', { name: 'Check', exact: true }).click();
      await host.getByRole('button', { name: 'Check', exact: true }).click();
    }
    await expect(host.locator('.hand-result__reason')).toHaveText('Showdown');
    await expect(host.locator('.hand-result__cards')).toHaveCount(2);
    await expect(guest.getByLabel('Revealed cards')).toBeVisible();
    await expect(host.getByText('Finishing session…', { exact: true })).toBeVisible();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10000 });
    await host.reload();
    await expect(host.locator('.hand-result__reason')).toHaveText('Showdown');
    await expect(host.locator('.poker-table__board .poker-card:not(.poker-card--empty)')).toHaveCount(5);
    await inspectLayouts(host, 'result-showdown');
    await host.setViewportSize({ width: 1440, height: 900 });
    await host.getByLabel('Room options', { exact: true }).click();
    await host.getByText('Four-colour suits', { exact: true }).click();
    await expect(host.locator('.poker-table')).toHaveClass(/four-colour/);
    await host.getByLabel('Room options', { exact: true }).click();
    const historyResponse = host.waitForResponse((response) => response.url().includes('/hands?'));
    await host.getByRole('link', { name: 'View hand history' }).click();
    const history = await (await historyResponse).json();
    expect(handHistorySchema.safeParse(history.data).success).toBe(true);
    await expect(host.locator('#hand-history .hand-result__reason')).toHaveText('Showdown');
    const historyToggle = host.getByRole('button', { name: 'Hand history', exact: true });
    await historyToggle.focus(); await host.keyboard.press('Enter');
    await expect(historyToggle).toHaveAttribute('aria-expanded', 'false');

    for (let i = 2; i < 6; i++) {
      const context = await browser.newContext(); contexts.push(context);
      await createAccountThroughNativeApi(context, { displayName: `Long Player ${i} Through the Looking Glass`, email: `result-${suffix}-${i}@example.test` });
      const page = await context.newPage(); pages.push(page);
      await page.goto('/#invite=' + encodeURIComponent(invite));
      await expect(page).toHaveURL(/\/rooms\//);
      await expect(page.getByRole('heading', { name: 'Result acceptance', exact: true })).toBeVisible();
    }
    if (await host.getByRole('button', { name: 'Use this tab to play' }).count()) await host.getByRole('button', { name: 'Use this tab to play' }).click();
    await expect(host.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
    // Refresh can transfer host controls to the connected guest; use the actual host.
    await expect(guest.getByRole('button', { name: 'Start new session' })).toBeEnabled();
    await guest.getByRole('button', { name: 'Start new session' }).click();
    await expect(host.locator('.poker-seat')).toHaveCount(6);
    await endAfterHand(guest);
    // All six call/check preflop, then five players fold on the flop.
    for (let turn = 0; turn < 6; turn++) {
      let actor: Page | undefined;
      await expect.poll(async () => {
        actor = undefined;
        for (const page of pages) if (await page.getByText('Your turn', { exact: true }).isVisible()) actor = page;
        return Boolean(actor);
      }).toBe(true);
      const call = actor!.getByRole('button', { name: /^Call / });
      if (await call.count()) await call.click(); else await actor!.getByRole('button', { name: 'Check', exact: true }).click();
    }
    await expect(host.locator('.poker-table__board .poker-card:not(.poker-card--empty)')).toHaveCount(3);
    for (let turn = 0; turn < 5; turn++) {
      let actor: Page | undefined;
      await expect.poll(async () => {
        actor = undefined;
        for (const page of pages) if (await page.getByText('Your turn', { exact: true }).isVisible()) actor = page;
        return Boolean(actor);
      }).toBe(true);
      await actor!.getByRole('button', { name: 'Fold', exact: true }).click();
    }
    await expect(host.locator('.hand-result__reason')).toHaveText('Won by fold');
    await expect(host.locator('.hand-result__cards')).toHaveCount(0);
    await expect(host.getByLabel('Hidden cards')).toHaveCount(5);
    await expect(host.getByText('Only visible to you', { exact: true })).toBeVisible();
    await expect(host.getByRole('heading', { name: 'Session standings' })).toBeVisible({ timeout: 10000 });
    await host.reload();
    await expect(host.locator('.hand-result__reason')).toHaveText('Won by fold');
    await expect(host.locator('.poker-table__board .poker-card:not(.poker-card--empty)')).toHaveCount(3);
    await expect(host.getByLabel('Empty community card slot')).toHaveCount(2);
    await expect(host.getByText('Only visible to you', { exact: true })).toHaveCount(0);
    await inspectLayouts(host, 'result-six-fold');
    // Browser zoom changes CSS viewport and pixel ratio. CSS `zoom` alone does
    // not update media queries and is not an equivalent responsive test.
    const zoomContext = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
    contexts.push(zoomContext);
    await zoomContext.addCookies(await host.context().cookies());
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto(host.url());
    await expect(zoomPage.locator('.hand-result__reason')).toHaveText('Won by fold');
    await expect.poll(() => zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await zoomPage.screenshot({ path: 'test-results/result-six-fold-200-percent.png', fullPage: true });
  } catch (error) {
    console.log('Result acceptance state:', await Promise.all(pages.map(async (page) => ({
      turn: await page.locator('.poker-turn').allTextContents(), completion: await page.locator('.hand-completion > div > strong').allTextContents(),
      controls: await page.getByRole('button', { name: /Use this tab|Start new|Fold|Check|Call / }).allTextContents(),
    }))));
    throw error;
  } finally { for (const context of [...contexts].reverse()) await context.close(); }
});
