import { Hono } from "hono";
import { GameEngine } from "@poker/shared";

const gameRouter = new Hono();

// Mock game state storage (in-memory for demo)
const mockGameState: any = null;

// Get or initialize mock game
gameRouter.get("/init", async (c) => {
  const players = [
    { id: "p1", username: "Player 1", chips: 1000 },
    { id: "p2", username: "Player 2", chips: 1000 },
  ];
  
  const engine = new GameEngine(players, 10, 20);
  const gameState = engine.startGame();

  return c.json({
    status: "ready",
    gameState,
    message: "Game initialized - players can now act",
  });
});

// Mock player action
gameRouter.post("/action", async (c) => {
  const { playerId, action } = await c.req.json();

  return c.json({
    status: "ok",
    action: action,
    message: `Player ${playerId} performed action: ${action.type}`,
  });
});

export default gameRouter;
