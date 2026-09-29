'use client';

import type { ClientToServerEvents, ServerToClientEvents } from '@poker/contracts';
import { io, type Socket } from 'socket.io-client';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createGameSocket(): GameSocket {
  return io({
    autoConnect: false,
    path: '/socket.io',
    transports: ['websocket'],
    withCredentials: true,
  });
}
