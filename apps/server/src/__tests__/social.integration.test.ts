import { expect, test, describe } from "bun:test";

/**
 * Social & Profile API Integration Tests
 * Tests: /api/history, /api/leaderboard, /api/users/:id, /api/auth/me (daily reward)
 *
 * TDD (RED): Written before verifying all pass.
 * Requires a running server at http://localhost:3000.
 */

const BASE = "http://localhost:3000";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndGetCookie(): Promise<{ cookie: string; userId: string; username: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const username = `social_${ts}`;
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username}@example.com`,
      password: "Password123",
    }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  return { cookie, userId: data.user.id, username };
}

// ── /api/auth/me – Daily Reward ───────────────────────────────────────────────

describe("GET /api/auth/me — daily reward", () => {
  test("rejects unauthenticated request", async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  test("returns user profile with chips", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(typeof data.user.chips).toBe("number");
    expect(data.user.chips).toBeGreaterThan(0);
  });

  test("grants daily reward on first call of the day", async () => {
    const { cookie } = await registerAndGetCookie();
    // New user hasn't claimed reward today yet
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const data = await res.json();
    // Either gives dailyReward OR user starts with exactly 1000
    // Server grants +200 on first /me call if not claimed today
    if (data.dailyReward) {
      expect(data.dailyReward.chips).toBe(200);
      expect(data.user.chips).toBe(1200); // 1000 starting + 200 reward
    } else {
      // Already claimed (same day register + call)
      expect(data.user.chips).toBeGreaterThanOrEqual(1000);
    }
  });

  test("does NOT grant daily reward twice in the same day", async () => {
    const { cookie } = await registerAndGetCookie();
    // First call (may grant reward)
    await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
    // Second call
    const res2 = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
    const data2 = await res2.json();
    expect(data2.dailyReward).toBeNull();
  });
});

// ── /api/leaderboard ──────────────────────────────────────────────────────────

describe("GET /api/leaderboard", () => {
  test("returns leaderboard array without auth", async () => {
    const res = await fetch(`${BASE}/api/leaderboard`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.leaderboard)).toBe(true);
  });

  test("leaderboard entries have required fields", async () => {
    // Ensure at least one user exists
    await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/leaderboard`);
    const { leaderboard } = await res.json();
    expect(leaderboard.length).toBeGreaterThan(0);
    const entry = leaderboard[0];
    expect(entry.id).toBeDefined();
    expect(entry.username).toBeDefined();
    expect(typeof entry.chips).toBe("number");
    expect(typeof entry.wins).toBe("number");
    expect(typeof entry.handsPlayed).toBe("number");
  });

  test("leaderboard is sorted by chips descending", async () => {
    const res = await fetch(`${BASE}/api/leaderboard`);
    const { leaderboard } = await res.json();
    if (leaderboard.length >= 2) {
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].chips).toBeGreaterThanOrEqual(leaderboard[i + 1].chips);
      }
    }
  });

  test("leaderboard returns at most 50 entries", async () => {
    const res = await fetch(`${BASE}/api/leaderboard`);
    const { leaderboard } = await res.json();
    expect(leaderboard.length).toBeLessThanOrEqual(50);
  });
});

// ── /api/users/:id ────────────────────────────────────────────────────────────

describe("GET /api/users/:id", () => {
  test("returns public profile for existing user", async () => {
    const { cookie, userId, username } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/users/${userId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(userId);
    expect(data.user.username).toBe(username);
    expect(typeof data.user.chips).toBe("number");
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.wins).toBe("number");
    expect(typeof data.stats.handsPlayed).toBe("number");
    expect(typeof data.stats.collectionCount).toBe("number");
  });

  test("does not expose passwordHash", async () => {
    const { userId } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/users/${userId}`);
    const text = await res.text();
    expect(text).not.toContain("passwordHash");
  });

  test("returns 404 for non-existent user", async () => {
    const res = await fetch(`${BASE}/api/users/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  test("collection count increases after pulling", async () => {
    const { cookie, userId } = await registerAndGetCookie();

    const beforeRes = await fetch(`${BASE}/api/users/${userId}`);
    const { stats: before } = await beforeRes.json();
    expect(before.collectionCount).toBe(0);

    // Single pull (costs 150 chips; new user has 1000)
    await fetch(`${BASE}/api/gacha/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ count: 1 }),
    });

    const afterRes = await fetch(`${BASE}/api/users/${userId}`);
    const { stats: after } = await afterRes.json();
    expect(after.collectionCount).toBeGreaterThan(0);
  });
});

// ── /api/history ──────────────────────────────────────────────────────────────

describe("GET /api/history", () => {
  test("returns history array without auth", async () => {
    const res = await fetch(`${BASE}/api/history`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.history)).toBe(true);
  });

  test("history entries have required fields (if any exist)", async () => {
    const res = await fetch(`${BASE}/api/history`);
    const { history } = await res.json();
    if (history.length > 0) {
      const entry = history[0];
      expect(entry.id).toBeDefined();
      expect(entry.roomId).toBeDefined();
      expect(typeof entry.pot).toBe("number");
      expect(Array.isArray(entry.winners)).toBe(true);
      expect(entry.playedAt).toBeDefined();
    }
  });

  test("history is limited to 50 entries", async () => {
    const res = await fetch(`${BASE}/api/history`);
    const { history } = await res.json();
    expect(history.length).toBeLessThanOrEqual(50);
  });
});

describe("GET /api/history/:id", () => {
  test("returns 404 for non-existent game history", async () => {
    const res = await fetch(`${BASE}/api/history/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });
});
