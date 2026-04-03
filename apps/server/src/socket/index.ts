import { Server } from "socket.io";
import { auth } from "../auth";
import { ClientToServerEvents, ServerToClientEvents } from "../../../packages/shared/src/types/socket";
import { registerRoomHandlers } from "./handlers/room";
import { registerGameHandlers } from "./handlers/game";
import { gameManager } from "./gameManager";

export function setupSocketIO(server: any) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  gameManager.setIo(io);

  // Auth Middleware
  io.use(async (socket, next) => {
    // Check if we passed a mock user from the frontend
    if (socket.handshake.auth && socket.handshake.auth.mockUser) {
      (socket as any).user = socket.handshake.auth.mockUser;
      return next();
    }

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
    const user = (socket as any).user;
    console.log(`User connected: ${user.username} (${socket.id})`);

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.username}`);
    });
  });

  return io;
}
