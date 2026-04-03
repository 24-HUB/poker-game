import { createMiddleware } from "hono/factory";
import { auth } from "../auth";
import { type User } from "../db/schema";

export type AuthContext = {
  Variables: {
    user: User;
    session: any;
  };
};

export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  // Cast user to User type from schema
  c.set("user", session.user as unknown as User);
  c.set("session", session.session);
  await next();
});
