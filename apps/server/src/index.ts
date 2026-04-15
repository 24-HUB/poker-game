import { Hono } from "hono";
import { cors } from "hono/cors";
import authRouter from "./routes/auth";
import roomsRouter from "./routes/rooms";

const app = new Hono();

// CORS configuration for the frontend
app.use("/*", cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Mock game endpoint
app.get("/api/game/mock", (c) => c.json({ 
  status: "ready",
  message: "Mock game initialized"
}));

// Mock socket.io endpoint for health check
app.get("/socket.io/", (c) => c.status(200).json({ ok: true }));

// Mount routers
app.route("/api/auth", authRouter);
app.route("/api/rooms", roomsRouter);

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Poker Backend is running on port ${port}`);
console.log(`API endpoints ready`);

export default server;
