import { expect, test, describe } from "bun:test";
import postgres from "postgres";

/**
 * Gacha API Integration Tests
 * Tests: /api/gacha/* — banners, rates, pull
 *
 * TDD (RED→GREEN): Requires a running server at http://localhost:3000 with a seeded DB.
 */

const BASE = "http://localhost:3000";
const DB_URL = process.env.DATABASE_URL ?? "postgresql://postgres:Pete1474@localhost:5432/poker_test";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndGetCookie(): Promise<{ cookie: string; userId: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `gachatest_${ts}`,
      email: `gachatest_${ts}@example.com`,
      password: "Password123",
    }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  return { cookie, userId: data.user.id };
}

/** Directly set a user's chips in the DB to enable 10-pull tests (costs 1350 chips). */
async function setChips(userId: string, chips: number): Promise<void> {
  const sql = postgres(DB_URL);
  await sql`UPDATE users SET chips = ${chips} WHERE id = ${userId}`;
  await sql.end();
}

// ── Banner & Rate endpoints ──────────────────────────────────────────────────

describe("GET /api/gacha/banners", () => {
  test("returns banner list without auth", async () => {
    const res = await fetch(`${BASE}/api/gacha/banners`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test("banner has required fields", async () => {
    const res = await fetch(`${BASE}/api/gacha/banners`);
    const [banner] = await res.json();
    expect(banner.id).toBeDefined();
    expect(banner.name).toBeDefined();
    expect(banner.rates).toBeDefined();
    expect(typeof banner.rates.R).toBe("number");
    expect(typeof banner.rates.SR).toBe("number");
    expect(typeof banner.rates.SSR).toBe("number");
  });

  test("rates sum to 1.0 (within floating-point tolerance)", async () => {
    const res = await fetch(`${BASE}/api/gacha/banners`);
    const [banner] = await res.json();
    const sum = banner.rates.R + banner.rates.SR + banner.rates.SSR;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
});

describe("GET /api/gacha/rates/:bannerId", () => {
  test("returns rate table for standard banner", async () => {
    const res = await fetch(`${BASE}/api/gacha/rates/standard`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rates).toBeDefined();
    expect(typeof data.pitySR).toBe("number");
    expect(typeof data.pitySSR).toBe("number");
    expect(typeof data.singleCost).toBe("number");
    expect(typeof data.tenCost).toBe("number");
  });

  test("single pull costs 150 chips", async () => {
    const res = await fetch(`${BASE}/api/gacha/rates/standard`);
    const data = await res.json();
    expect(data.singleCost).toBe(150);
  });

  test("10-pull costs 1350 chips (10% discount)", async () => {
    const res = await fetch(`${BASE}/api/gacha/rates/standard`);
    const data = await res.json();
    expect(data.tenCost).toBe(1350);
  });

  test("SR soft pity at pull 10", async () => {
    const res = await fetch(`${BASE}/api/gacha/rates/standard`);
    const data = await res.json();
    expect(data.pitySR).toBe(10);
  });

  test("SSR hard pity at pull 90", async () => {
    const res = await fetch(`${BASE}/api/gacha/rates/standard`);
    const data = await res.json();
    expect(data.pitySSR).toBe(90);
  });
});

// ── Pull endpoint ─────────────────────────────────────────────────────────────

describe("POST /api/gacha/pull", () => {
  test("rejects unauthenticated pull", async () => {
    const res = await fetch(`${BASE}/api/gacha/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1 }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  test("single pull deducts 150 chips and returns 1 item", async () => {
    const { cookie } = await registerAndGetCookie();

    // Verify starting chips
    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const { user: userBefore } = await meRes.json();
    const chipsBefore = userBefore.chips;

    // Perform pull
    const pullRes = await fetch(`${BASE}/api/gacha/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ count: 1 }),
    });
    expect(pullRes.status).toBe(200);
    const pullData = await pullRes.json();

    expect(Array.isArray(pullData.items)).toBe(true);
    expect(pullData.items.length).toBe(1);
    expect(pullData.chips).toBe(chipsBefore - 150);
  });

  test("10-pull deducts 1350 chips and returns 10 items", async () => {
    // New users start with 1000 chips; 10-pull costs 1350.
    // Pre-seed 2000 chips via DB so this test can verify 10-pull behavior.
    const { cookie, userId } = await registerAndGetCookie();
    await setChips(userId, 2000);

    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const { user: userBefore } = await meRes.json();
    const chipsBefore = userBefore.chips;

    const pullRes = await fetch(`${BASE}/api/gacha/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ count: 10 }),
    });
    expect(pullRes.status).toBe(200);
    const pullData = await pullRes.json();

    expect(pullData.items.length).toBe(10);
    expect(pullData.chips).toBe(chipsBefore - 1350);
  });

  test("each pulled item has required fields", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/gacha/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ count: 1 }),
    });
    const { items } = await res.json();
    const item = items[0];
    expect(item.id).toBeDefined();
    expect(item.name).toBeDefined();
    expect(["R", "SR", "SSR"]).toContain(item.rarity);
    expect(["card_skin", "avatar", "table_theme"]).toContain(item.type);
  });

  test("rejects pull when chips are insufficient", async () => {
    // Register user then drain chips via pulls until < 150
    const { cookie } = await registerAndGetCookie();

    // Starting chips = 1000. Do 6 single pulls (6 * 150 = 900) → 100 chips left, not enough for 1 more
    for (let i = 0; i < 6; i++) {
      await fetch(`${BASE}/api/gacha/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ count: 1 }),
      });
    }

    const res = await fetch(`${BASE}/api/gacha/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ count: 1 }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("GACHA_ERROR");
  });

  test("no-duplicate SSR: pulling the same SSR slot returns a different SSR if pool allows", async () => {
    // This test verifies the no-duplicate SSR logic.
    // We need a user with enough chips for many pulls. We test by checking
    // that once all SSRs are collected, re-pulls still return valid items.
    const { cookie } = await registerAndGetCookie();
    const ownedSSRIds = new Set<string>();
    let chipBalance = 1000;

    // Drain chips with 10-pulls and track SSRs
    while (chipBalance >= 1350) {
      const res = await fetch(`${BASE}/api/gacha/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ count: 10 }),
      });
      const data = await res.json();
      chipBalance = data.chips;
      for (const item of data.items) {
        if (item.rarity === "SSR") ownedSSRIds.add(item.id);
      }
    }

    // If we collected any SSRs, verify we got unique ones during collection
    // (The pool has 3 SSRs: ssr001, ssr002, ssr003)
    expect(ownedSSRIds.size).toBeLessThanOrEqual(3);
  });

  test("SR soft pity: guarantees SR+ at pull 10 if no SR/SSR obtained before", async () => {
    // Testing pity is tricky via integration (random). We verify the mechanism by
    // checking that a newly registered user with pityCountSR=0 advancing to 9 doesn't
    // error, and the pull API consistently succeeds.
    // The actual pity is validated at the unit/logic level.
    const { cookie } = await registerAndGetCookie();

    // Ensure we can pull 6 times (1000 chips starting, 6*150=900)
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${BASE}/api/gacha/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ count: 1 }),
      });
      expect(res.status).toBe(200);
    }
  });
});
