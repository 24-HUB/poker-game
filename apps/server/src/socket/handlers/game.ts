import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents, GameAction } from "../../../../../packages/shared/src/types/socket";
import { gameManager } from "../gameManager";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export function registerGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  const user = (socket as any).user;

  socket.on("game:action", async (action: GameAction) => {
    const roomId = (socket as any).roomId;
    if (!roomId) return;

    try {
      const state = gameManager.handleAction(roomId, user.id, action);
      
      // If it's a showdown, handle winner resolution
      if (state.phase === 'showdown') {
         const result = gameManager.resolveShowdown(roomId);
         if (result) {
            // Update DB chips atomically — all players in one transaction
            await db.transaction(async (tx) => {
               for (const p of state.players) {
                  const winAmount = result.payouts.get(p.id) || 0;
                  const netChange = winAmount - p.totalContributed;

                  if (netChange !== 0) {
                     await tx.update(users)
                        .set({ chips: sql`${users.chips} + ${netChange}` })
                        .where(eq(users.id, p.id));
                  }
               }
            });

            // Emit game end
            const winners = Array.from(result.payouts.entries()).map(([playerId, amount]: [any, any]) => ({
              playerId,
              amount
            }));
            
            // Show all cards in showdown
            io.to(roomId).emit("game:stateUpdate", state);
            io.to(roomId).emit("game:ended", winners);
            return;
         }
      }

      // Public state (hide cards)
      const publicState = {
        ...state,
        players: state.players.map((p: any) => ({ ...p, cards: [] }))
      };
      
      io.to(roomId).emit("game:stateUpdate", publicState as any);

      // Notify next turn
      if (state.activePlayerId) {
        io.to(roomId).emit("game:playerTurn", state.activePlayerId, 30000);
      }

    } catch (e: any) {
      console.error(`Action error from ${user.username}: ${e.message}`);
      // Optionally emit error back to user
    }
  });

  socket.on("game:chat", (message: string) => {
    const roomId = (socket as any).roomId;
    if (!roomId) return;
    io.to(roomId).emit("game:chatMessage", user.id, user.username, message);
  });
}
