import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../../../../../packages/shared/src/types/socket";
import { gameManager } from "../gameManager";
import { PlayerState } from "../../../../../packages/shared/src/types/game";
import { type AuthSocket } from "../types";

// In-memory room management for ready states
const readyPlayers: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds

export function registerRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthSocket
) {
  const user = socket.user;

  socket.on("room:join", (roomId: string) => {
    socket.join(roomId);
    socket.roomId = roomId;

    // Notify others in the room
    const player: PlayerState = {
      id: user.id,
      username: user.username,
      chips: user.chips || 1000,
      bet: 0,
      cards: [],
      status: 'active',
      isDealer: false,
      isTurn: false,
      hasActed: false,
      totalContributed: 0,
    };
    
    socket.to(roomId).emit("room:playerJoined", player);
    console.log(`${user.username} joined room ${roomId}`);
  });

  socket.on("room:leave", () => {
    const roomId = socket.roomId;
    if (roomId) {
      socket.leave(roomId);
      readyPlayers.get(roomId)?.delete(user.id);
      io.to(roomId).emit("room:playerLeft", user.id);
      socket.roomId = undefined;
    }
  });

  socket.on("room:ready", async () => {
    const roomId = socket.roomId;
    if (!roomId) return;

    if (!readyPlayers.has(roomId)) {
      readyPlayers.set(roomId, new Set());
    }
    
    const roomReady = readyPlayers.get(roomId)!;
    roomReady.add(user.id);

    // Get all sockets in the room to count players
    const sockets = await io.in(roomId).fetchSockets();
    const playersInRoom = sockets.map(s => ({
      id: (s as any).user.id,
      username: (s as any).user.username,
      chips: (s as any).user.chips || 1000,
    }));

    if (roomReady.size >= 2 && roomReady.size === playersInRoom.length) {
      // Start Game
      console.log(`Starting game in room ${roomId}`);
      const state = gameManager.startGame(roomId, playersInRoom, 10, 20);
      
      io.to(roomId).emit("game:started");
      
      // Send public state (no cards)
      const publicState = {
        ...state,
        players: state.players.map(p => ({ ...p, cards: [] }))
      };
      io.to(roomId).emit("game:stateUpdate", publicState as any);

      // Send private cards to each socket
      for (const s of sockets) {
        const userId = (s as any).user.id;
        const cards = gameManager.getPrivateCards(roomId, userId);
        s.emit("game:yourCards", cards);
      }

      // Notify first player
      if (state.activePlayerId) {
        io.to(roomId).emit("game:playerTurn", state.activePlayerId, 30000);
      }

      // Clear ready states for next round
      readyPlayers.delete(roomId);
    }
  });
}
