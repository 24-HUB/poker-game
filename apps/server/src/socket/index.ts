import { Server } from "socket.io";
import { auth } from "../auth";
import { ClientToServerEvents, ServerToClientEvents } from "../../../packages/shared/src/types/socket";
import { registerRoomHandlers } from "./handlers/room";
import { registerGameHandlers } from "./handlers/game";
import { gameManager } from "./gameManager";
import { type AuthSocket } from "./types";

export function setupSocketIO(server: any) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    },
  });

  gameManager.setIo(io);

  // Auth Middleware
  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: socket.handshake.headers as any,
      });

      if (!session) {
        return next(new Error("Unauthorized"));
      }

      (socket as any).user = session.user;
      (socket as any).session = session.session;
      next();
    } catch(err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const authSocket = socket as unknown as AuthSocket;
    const user = authSocket.user;
    console.log(`User connected: ${user.username} (${socket.id})`);

    registerRoomHandlers(io, authSocket);
    registerGameHandlers(io, authSocket);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.username}`);
    });
  });

  return io;
}
