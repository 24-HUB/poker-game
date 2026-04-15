import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../auth";
import { authMiddleware, type AuthContext } from "../middleware/auth";

const authRouter = new Hono<AuthContext>();

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/auth/register
authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const { username, email, password } = c.req.valid("json");

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return c.json({ error: "User already exists", code: "USER_EXISTS" }, 400);
  }

  // Hash password using Bun built-in
  const passwordHash = await Bun.password.hash(password);

  try {
    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      chips: 1000,
    }).returning();

    // Create session using Better-Auth
    const session = await auth.api.createSession({
      userId: newUser.id,
      headers: c.req.raw.headers,
    });

    return c.json({ user: newUser, session });
  } catch (error) {
    return c.json({ error: "Registration failed", code: "REGISTRATION_ERROR" }, 500);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/login
authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
    return c.json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, 401);
  }

  // Create session and return it (which should handle cookie in headers if using auth.api with c.req.raw.headers)
  const sessionResponse = await auth.api.createSession({
    userId: user.id,
    headers: c.req.raw.headers,
  });

  return c.json({ user, session: sessionResponse });
});

// POST /api/auth/logout
authRouter.post("/logout", async (c) => {
  await auth.api.signOut({
    headers: c.req.raw.headers,
  });
  return c.json({ success: true });
});

// GET /api/auth/me
authRouter.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ user });
});

export default authRouter;
