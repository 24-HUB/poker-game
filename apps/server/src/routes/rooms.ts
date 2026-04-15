import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { rooms } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthContext } from "../middleware/auth";

const roomsRouter = new Hono<AuthContext>();

const roomIdParamSchema = z.object({ id: z.string().uuid() });

// GET /api/rooms: list rooms with status='waiting', include player count
roomsRouter.get("/", async (c) => {
  const waitingRooms = await db.query.rooms.findMany({
    where: eq(rooms.status, "waiting"),
  });

  // Note: Current schema does not have a players/room_players table.
  // In a full implementation, this would count active players in each room.
  const roomsWithCount = waitingRooms.map((room) => ({
    ...room,
    playerCount: 0, 
  }));

  return c.json(roomsWithCount);
});

const createRoomSchema = z.object({
  name: z.string().min(3).max(100),
  maxPlayers: z.number().int().min(2).max(10).default(6),
  minBet: z.number().int().min(1).default(10),
});

// POST /api/rooms: create room, set hostId from session
roomsRouter.post("/", authMiddleware, zValidator("json", createRoomSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  try {
    const [newRoom] = await db.insert(rooms).values({
      ...data,
      hostId: user.id,
      status: "waiting",
    }).returning();

    return c.json(newRoom);
  } catch (error) {
    return c.json({ error: "Failed to create room", code: "CREATE_ROOM_ERROR" }, 500);
  }
});

// GET /api/rooms/:id: room details
roomsRouter.get("/:id", zValidator("param", roomIdParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, id),
  });

  if (!room) {
    return c.json({ error: "Room not found", code: "NOT_FOUND" }, 404);
  }

  return c.json(room);
});

// DELETE /api/rooms/:id: only host can delete, requires auth
roomsRouter.delete("/:id", authMiddleware, zValidator("param", roomIdParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, id),
  });

  if (!room) {
    return c.json({ error: "Room not found", code: "NOT_FOUND" }, 404);
  }

  if (room.hostId !== user.id) {
    return c.json({ error: "Only the host can delete this room", code: "FORBIDDEN" }, 403);
  }

  await db.delete(rooms).where(eq(rooms.id, id));

  return c.json({ success: true });
});

export default roomsRouter;
