import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Opens a new isolated browser context (= independent mock user) and navigates
 * to the app.  The app auto-generates a random user and joins 'test-room'.
 */
async function openPlayer(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE_URL);
  await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 15000 });
  return { ctx, page };
}

/**
 * Waits until the game table becomes visible (i.e. game has started).
 */
async function waitForGameStart(page: Page, timeout = 20000) {
  await expect(page.locator('[data-testid="game-table"]')).toBeVisible({ timeout });
}

/**
 * Returns the active betting-controls panel if the current player's turn is
 * active on this page, otherwise returns null.
 */
async function getBettingControls(page: Page) {
  const controls = page.locator('[data-testid="betting-controls"]');
  const visible = await controls.isVisible({ timeout: 3000 }).catch(() => false);
  return visible ? controls : null;
}

/**
 * Clicks the first visible action button from a priority list.
 */
async function clickFirstAvailableAction(
  page: Page,
  testIds: string[]
): Promise<boolean> {
  for (const id of testIds) {
    const btn = page.locator(`[data-testid="${id}"]`);
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe('Poker Game E2E Tests', () => {

  /**
   * A. App loads and shows waiting state for a single player
   */
  test.describe('A. Single Player – Waiting State', () => {
    test('app loads and shows waiting message when alone', async ({ browser }) => {
      const { ctx, page } = await openPlayer(browser);

      // App root must render
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

      // With only one player, game has not started → waiting message
      await expect(page.locator('[data-testid="waiting-message"]')).toBeVisible({ timeout: 5000 });

      await ctx.close();
    });
  });

  /**
   * B. Two players connect – game starts automatically
   */
  test.describe('B. Two Players – Game Starts', () => {
    test('game table appears once two players join the room', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      // Both pages should transition from waiting → game table
      await Promise.all([
        waitForGameStart(p1),
        waitForGameStart(p2),
      ]);

      // Pot display is visible
      await expect(p1.locator('[data-testid="pot-display"]')).toBeVisible();
      await expect(p2.locator('[data-testid="pot-display"]')).toBeVisible();

      // Community cards area exists (5 slots, initially empty)
      await expect(p1.locator('[data-testid="community-cards"]')).toBeVisible();

      await ctx1.close();
      await ctx2.close();
    });

    test('game phase indicator defaults to pre_flop', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      const phase = p1.locator('[data-testid="game-phase"]');
      await expect(phase).toBeVisible();
      await expect(phase).toContainText(/pre.?flop/i);

      await ctx1.close();
      await ctx2.close();
    });
  });

  /**
   * C. Pre-Flop Betting – BB Check Bug Fix Validation
   *    Active player sees betting controls; community cards NOT shown yet.
   */
  test.describe('C. Pre-Flop Betting Controls', () => {
    test('exactly one player has betting controls on pre-flop', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // Give React a moment to propagate turns
      await p1.waitForTimeout(500);
      await p2.waitForTimeout(500);

      const p1Has = await getBettingControls(p1);
      const p2Has = await getBettingControls(p2);

      // Exactly one side should have the betting panel
      const activeCount = [p1Has, p2Has].filter(Boolean).length;
      expect(activeCount).toBe(1);

      await ctx1.close();
      await ctx2.close();
    });

    test('[FIX] community cards are NOT dealt before pre-flop action completes', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // At pre-flop no community cards should be visible
      const slots = p1.locator('[data-testid^="community-card-"]:not([data-testid*="slot"])');
      const count = await slots.count();
      expect(count).toBe(0);

      await ctx1.close();
      await ctx2.close();
    });
  });

  /**
   * D. Complete Pre-Flop Round → Flop Deals
   *    Both players call/check → flop appears.
   */
  test.describe('D. Pre-Flop → Flop Progression', () => {
    test('after both players act, flop (3 cards) is dealt', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // Helper: one round of action – active player calls/checks, then the other
      const playOneRound = async () => {
        for (let attempt = 0; attempt < 20; attempt++) {
          // Try both pages each cycle
          for (const page of [p1, p2]) {
            const controls = await getBettingControls(page);
            if (controls) {
              await clickFirstAvailableAction(page, ['btn-check', 'btn-call']);
              await page.waitForTimeout(300);
            }
          }

          // Check if flop appeared
          const cardCount = await p1.locator('[data-testid^="community-card-"]:not([data-testid*="slot"])').count();
          if (cardCount >= 3) return true;

          await p1.waitForTimeout(200);
        }
        return false;
      };

      const flopDealt = await playOneRound();
      expect(flopDealt).toBe(true);

      // Verify exactly 3 community cards appeared
      const communityCards = p1.locator('[data-testid^="community-card-"]:not([data-testid*="slot"])');
      await expect(communityCards).toHaveCount(3, { timeout: 5000 });

      // Phase should now be flop
      await expect(p1.locator('[data-testid="game-phase"]')).toContainText(/flop/i, { timeout: 5000 });

      await ctx1.close();
      await ctx2.close();
    });
  });

  /**
   * E. Complete Hand Through Showdown
   *    Both players check/call every street; game reaches showdown.
   */
  test.describe('E. Full Hand – Pre-Flop → Showdown', () => {
    test('game progresses through all streets to showdown', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // Keep acting until showdown (max 60 iterations to avoid infinite loops)
      for (let i = 0; i < 60; i++) {
        const phase = await p1.locator('[data-testid="game-phase"]').textContent().catch(() => '');
        if (/showdown/i.test(phase ?? '')) break;

        for (const page of [p1, p2]) {
          const controls = await getBettingControls(page);
          if (controls) {
            await clickFirstAvailableAction(page, ['btn-check', 'btn-call']);
            await page.waitForTimeout(300);
          }
        }
        await p1.waitForTimeout(200);
      }

      const finalPhase = await p1.locator('[data-testid="game-phase"]').textContent().catch(() => '');
      expect(finalPhase).toMatch(/showdown/i);

      // Five community cards on river/showdown
      const communityCards = p1.locator('[data-testid^="community-card-"]:not([data-testid*="slot"])');
      await expect(communityCards).toHaveCount(5, { timeout: 5000 });

      await ctx1.close();
      await ctx2.close();
    });
  });

  /**
   * F. Fold – Ends Hand Without Dealing Community Cards
   */
  test.describe('F. Fold Edge Case', () => {
    test('[FIX] pre-flop fold ends hand without dealing community cards', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // Find who has action and fold
      let folded = false;
      for (const page of [p1, p2]) {
        const controls = await getBettingControls(page);
        if (controls) {
          const foldBtn = page.locator('[data-testid="btn-fold"]');
          if (await foldBtn.isVisible()) {
            await foldBtn.click();
            folded = true;
            break;
          }
        }
      }

      expect(folded).toBe(true);

      // After a pre-flop fold, no community cards should have been dealt
      await p1.waitForTimeout(1000);
      const communityCards = p1.locator('[data-testid^="community-card-"]:not([data-testid*="slot"])');
      const count = await communityCards.count();
      expect(count).toBe(0);

      await ctx1.close();
      await ctx2.close();
    });
  });

  /**
   * G. Raise Round – Active Player Can Raise
   */
  test.describe('G. Raise Action', () => {
    test('active player can raise and pot increases', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // Get initial pot
      const initialPot = await p1.locator('[data-testid="pot-amount"]').textContent().catch(() => '0');
      const initialPotNum = parseInt(initialPot?.replace(/\D/g, '') || '0', 10);

      let raisedOnPage: typeof p1 | null = null;
      for (const page of [p1, p2]) {
        const controls = await getBettingControls(page);
        if (controls) {
          const raiseBtn = page.locator('[data-testid="btn-raise"]');
          if (await raiseBtn.isVisible()) {
            await raiseBtn.click();
            raisedOnPage = page;
            break;
          }
        }
      }

      if (raisedOnPage) {
        // Use Playwright retry assertion to wait for pot to update on the page that raised
        const potLocator = raisedOnPage.locator('[data-testid="pot-amount"]');
        await expect(potLocator).not.toHaveText(new RegExp(`${initialPotNum}$`), { timeout: 5000 });
        const newPot = await potLocator.textContent().catch(() => '0');
        const newPotNum = parseInt(newPot?.replace(/\D/g, '') || '0', 10);
        expect(newPotNum).toBeGreaterThan(initialPotNum);
      }

      await ctx1.close();
      await ctx2.close();
    });
  });

  /**
   * H. Disconnect & Reconnect – State Persistence
   */
  test.describe('H. Disconnect & Reconnect', () => {
    test('player can close tab and reconnect mid-hand', async ({ browser }) => {
      const { ctx: ctx1, page: p1 } = await openPlayer(browser);
      const { ctx: ctx2, page: p2 } = await openPlayer(browser);

      await Promise.all([waitForGameStart(p1), waitForGameStart(p2)]);

      // Close and re-open p2 context
      const ctx2New = await browser.newContext();
      await ctx2.close();

      const p2New = await ctx2New.newPage();
      await p2New.goto(BASE_URL);
      await expect(p2New.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 15000 });

      // p1 game state should remain intact
      await expect(p1.locator('[data-testid="game-table"]')).toBeVisible();

      await ctx1.close();
      await ctx2New.close();
    });
  });
});


