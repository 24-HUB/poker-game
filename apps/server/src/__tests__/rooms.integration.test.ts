import { expect, test, describe, beforeAll } from "bun:test";

/**
 * Rooms API Integration Tests
 * Tests: /api/rooms — list, create, get, delete
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
      username: `roomtest_${ts}`,
      email: `roomtest_${ts}@example.com`,
      password: "Password123",
    }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  return { cookie, userId: data.user.id };
}

// ── GET /api/rooms ────────────────────────────────────────────────────────────

describe("GET /api/rooms", () => {
  test("returns an array (no auth required)", async () => {
    const res = await fetch(`${BASE}/api/rooms`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("returned rooms have required fields", async () => {
    // Create a room first to ensure at least one exists
    const { cookie } = await registerAndGetCookie();
    await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Test Room List" }),
    });

    const res = await fetch(`${BASE}/api/rooms`);
    const rooms = await res.json();
    if (rooms.length > 0) {
      const room = rooms[0];
      expect(room.id).toBeDefined();
      expect(room.name).toBeDefined();
      expect(room.hostId).toBeDefined();
      expect(typeof room.maxPlayers).toBe("number");
      expect(typeof room.minBet).toBe("number");
      expect(["waiting", "playing", "finished"]).toContain(room.status);
      expect(room.createdAt).toBeDefined();
    }
  });
});

// ── POST /api/rooms ───────────────────────────────────────────────────────────

describe("POST /api/rooms", () => {
  test("rejects unauthenticated room creation", async () => {
    const res = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorized Room" }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  test("creates a room with valid data", async () => {
    const { cookie, userId } = await registerAndGetCookie();
    const ts = Date.now();
    const res = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: `Test Room ${ts}`,
        maxPlayers: 4,
        minBet: 20,
      }),
    });
    expect(res.status).toBe(200);
    const room = await res.json();
    expect(room.id).toBeDefined();
    expect(room.name).toBe(`Test Room ${ts}`);
    expect(room.maxPlayers).toBe(4);
    expect(room.minBet).toBe(20);
    expect(room.hostId).toBe(userId);
    expect(room.status).toBe("waiting");
  });

  test("uses defaults when maxPlayers and minBet are omitted", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Default Room" }),
    });
    expect(res.status).toBe(200);
    const room = await res.json();
    expect(room.maxPlayers).toBe(6);
    expect(room.minBet).toBe(10);
  });

  test("rejects room with short name (< 3 chars)", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "AB" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("VALIDATION");
  });

  test("rejects room with missing name", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/rooms/:id ────────────────────────────────────────────────────────

describe("GET /api/rooms/:id", () => {
  test("returns room by id", async () => {
    const { cookie } = await registerAndGetCookie();
    const createRes = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Room Get Test" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${BASE}/api/rooms/${created.id}`);
    expect(res.status).toBe(200);
    const room = await res.json();
    expect(room.id).toBe(created.id);
    expect(room.name).toBe("Room Get Test");
  });

  test("returns 404 for non-existent room", async () => {
    const res = await fetch(`${BASE}/api/rooms/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });
});

// ── DELETE /api/rooms/:id ─────────────────────────────────────────────────────

describe("DELETE /api/rooms/:id", () => {
  test("rejects unauthenticated delete", async () => {
    const { cookie } = await registerAndGetCookie();
    const createRes = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Delete Test Room" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${BASE}/api/rooms/${created.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  test("allows host to delete their room", async () => {
    const { cookie } = await registerAndGetCookie();
    const createRes = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Host Delete Room" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${BASE}/api/rooms/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("prevents non-host from deleting a room", async () => {
    const { cookie: hostCookie } = await registerAndGetCookie();
    const { cookie: otherCookie } = await registerAndGetCookie();

    // Host creates a room
    const createRes = await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: hostCookie },
      body: JSON.stringify({ name: "Non-Host Delete Room" }),
    });
    const created = await createRes.json();

    // Other user tries to delete
    const res = await fetch(`${BASE}/api/rooms/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: otherCookie },
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe("FORBIDDEN");
  });

  test("returns 404 when deleting non-existent room", async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await fetch(`${BASE}/api/rooms/00000000-0000-0000-0000-000000000000`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});
