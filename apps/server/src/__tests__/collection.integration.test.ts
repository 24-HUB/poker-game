import { expect, test, describe } from "bun:test";

/**
 * Collection API Integration Tests
 * Tests: /api/collection — list, equip
 *
 * TDD (RED): Written before verifying all pass.
 * Requires a running server at http://localhost:3000.
 */

const BASE = "http://localhost:3000";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndGetCookie(): Promise<{ cookie: string; userId: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `colltest_${ts}`,
      email: `colltest_${ts}@example.com`,
      password: "Password123",
    }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  return { cookie, userId: data.user.id };
}

async function pull(cookie: string, count: 1 | 10 = 1) {
  const res = await fetch(`${BASE}/api/gacha/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ count }),
  });
  return res.json();
}

// ── Collection list ──────────────────────────────────────────────────────────

describe("GET /api/collection", () => {
  test("rejects unauthenticated request", async () => {
    const res = await fetch(`${BASE}/api/collection`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  test("returns empty collection for new user", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/collection`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBe(0);
    expect(data.equippedCardSkin).toBeNull();
  });

  test("collection grows after pulling", async () => {
    const { cookie } = await registerAndGetCookie();
    await pull(cookie, 1);

    const res = await fetch(`${BASE}/api/collection`, {
      headers: { Cookie: cookie },
    });
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
  });

  test("collection items have required fields", async () => {
    const { cookie } = await registerAndGetCookie();
    await pull(cookie, 1);

    const res = await fetch(`${BASE}/api/collection`, {
      headers: { Cookie: cookie },
    });
    const { items } = await res.json();
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];
    expect(item.id).toBeDefined();
    expect(item.name).toBeDefined();
    expect(["R", "SR", "SSR"]).toContain(item.rarity);
    expect(["card_skin", "avatar", "table_theme"]).toContain(item.type);
    expect(typeof item.isEquipped).toBe("boolean");
  });

  test("no duplicate items in collection (unique constraint respected)", async () => {
    const { cookie } = await registerAndGetCookie();
    // Do 3 single pulls; unique constraint means no duplicates in collection
    await pull(cookie, 1);
    await pull(cookie, 1);
    await pull(cookie, 1);

    const res = await fetch(`${BASE}/api/collection`, {
      headers: { Cookie: cookie },
    });
    const { items } = await res.json();
    const ids = items.map((i: { id: string }) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ── Equip ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/collection/:itemId/equip", () => {
  test("rejects unauthenticated request", async () => {
    const res = await fetch(`${BASE}/api/collection/r001/equip`, {
      method: "PATCH",
    });
    expect(res.status).toBe(401);
  });

  test("returns 404 when item is not in user collection", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/collection/r001/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  test("equips a card_skin item the user owns", async () => {
    const { cookie } = await registerAndGetCookie();

    // Pull until we get a card_skin (r001–r005 are R-rarity card_skins; ~85% chance per pull).
    // Budget: 6 single pulls (6 × 150 = 900 chips from starting 1000).
    let cardSkinId: string | null = null;
    for (let i = 0; i < 6 && !cardSkinId; i++) {
      const pullData = await pull(cookie, 1);
      const item = pullData.items?.[0];
      if (item?.type === "card_skin") cardSkinId = item.id;
    }

    if (!cardSkinId) {
      console.log("Skipping equip test: no card_skin obtained in pull budget");
      return;
    }

    const res = await fetch(`${BASE}/api/collection/${cardSkinId}/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.equipped).toBe(true);
    expect(data.itemId).toBe(cardSkinId);
    expect(data.equippedCardSkin).toBe(cardSkinId);
  });

  test("equipping same card_skin again unequips it (toggle)", async () => {
    const { cookie } = await registerAndGetCookie();

    let cardSkinId: string | null = null;
    for (let i = 0; i < 6 && !cardSkinId; i++) {
      const pullData = await pull(cookie, 1);
      const item = pullData.items?.[0];
      if (item?.type === "card_skin") cardSkinId = item.id;
    }

    if (!cardSkinId) {
      console.log("Skipping toggle test: no card_skin obtained");
      return;
    }

    // First equip
    await fetch(`${BASE}/api/collection/${cardSkinId}/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });

    // Second equip (toggle off)
    const res = await fetch(`${BASE}/api/collection/${cardSkinId}/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.equipped).toBe(false);
    expect(data.equippedCardSkin).toBeNull();
  });

  test("only one card_skin can be equipped at a time", async () => {
    const { cookie } = await registerAndGetCookie();

    // Collect 2 different card_skin IDs via single pulls (6 pulls max, budget ≤ 1000 chips)
    const cardSkinIds: string[] = [];
    for (let i = 0; i < 6 && cardSkinIds.length < 2; i++) {
      const pullData = await pull(cookie, 1);
      const item = pullData.items?.[0];
      if (item?.type === "card_skin" && !cardSkinIds.includes(item.id)) {
        cardSkinIds.push(item.id);
      }
    }

    if (cardSkinIds.length < 2) {
      console.log("Skipping single-equip test: need 2+ card_skins");
      return;
    }

    // Equip first
    await fetch(`${BASE}/api/collection/${cardSkinIds[0]}/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });

    // Equip second
    await fetch(`${BASE}/api/collection/${cardSkinIds[1]}/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });

    // Verify collection state: only second is equipped
    const colRes = await fetch(`${BASE}/api/collection`, {
      headers: { Cookie: cookie },
    });
    const { items, equippedCardSkin } = await colRes.json();
    expect(equippedCardSkin).toBe(cardSkinIds[1]);
    const first = items.find((i: { id: string }) => i.id === cardSkinIds[0]);
    const second = items.find((i: { id: string }) => i.id === cardSkinIds[1]);
    expect(first?.isEquipped).toBe(false);
    expect(second?.isEquipped).toBe(true);
  });

  test("cannot equip non-card_skin items (avatar)", async () => {
    const { cookie } = await registerAndGetCookie();

    // Non-card_skin items are SR/SSR. Pull up to 6 times; may not always appear.
    let nonSkinId: string | null = null;
    for (let i = 0; i < 6 && !nonSkinId; i++) {
      const pullData = await pull(cookie, 1);
      const item = pullData.items?.[0];
      if (item && item.type !== "card_skin") nonSkinId = item.id;
    }

    if (!nonSkinId) {
      console.log("Skipping non-skin equip test: no non-card_skin obtained");
      return;
    }

    const res = await fetch(`${BASE}/api/collection/${nonSkinId}/equip`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID");
  });
});
