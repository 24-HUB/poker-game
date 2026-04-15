import { Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../../../../packages/shared/src/types/socket";
import { type User } from "../db/schema";

export type AuthSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  user: User;
  roomId?: string;
};
