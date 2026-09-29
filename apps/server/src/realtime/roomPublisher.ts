import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

import { IdentityService, toWebHeaders } from '../modules/identity/identity.service';
import { RoomService } from '../modules/rooms/room.service';

@Injectable()
export class RoomPublisher {
  private server: Server | null = null;

  public constructor(
    private readonly identity: IdentityService,
    private readonly rooms: RoomService,
  ) {}

  public attach(server: Server): void {
    this.server = server;
  }

  public async publish(roomId: string): Promise<void> {
    if (!this.server) return;
    const sockets = [...this.server.sockets.sockets.values()];
    await Promise.all(sockets.map(async (socket) => {
      let resolved;
      try {
        resolved = await this.identity.resolve(toWebHeaders(socket.handshake.headers));
      } catch {
        return;
      }
      if (!resolved) {
        socket.disconnect(true);
        return;
      }
      const result = await this.rooms.execute(
        { identity: resolved, connectionId: socket.id },
        { type: 'room:sync', roomId },
      );
      if (result.data?.room) socket.emit('room:snapshot', result.data.room);
      else if (result.error?.code === 'ROOM_CLOSED') {
        const reason = await this.rooms.closedReason(roomId);
        if (reason) socket.emit('room:closed', { roomId, reason });
      }
    }));
  }
}
