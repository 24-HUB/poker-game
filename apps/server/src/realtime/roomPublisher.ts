import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

import { IdentityService, toWebHeaders } from '../modules/identity/identity.service';
import { RoomService } from '../modules/rooms/room.service';
import { GameService } from '../modules/rooms/game.service';

@Injectable()
export class RoomPublisher {
  private server: Server | null = null;

  public constructor(
    private readonly identity: IdentityService,
    private readonly rooms: RoomService,
    private readonly games: GameService,
  ) {
    this.games.subscribeUpdates((roomId) => { void this.publish(roomId).catch(() => undefined); });
  }

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
      const result = await this.rooms.snapshotForPublication(
        { identity: resolved, connectionId: socket.id }, roomId,
      );
      if (result.data?.room) {
        socket.emit('room:snapshot', result.data.room);
        const game = await this.games.execute(
          { identity: resolved, connectionId: socket.id, headers: toWebHeaders(socket.handshake.headers) },
          { type: 'game:sync', roomId },
        );
        if (game.data?.game) socket.emit('game:snapshot', game.data.game);
      }
      else if (result.error?.code === 'ROOM_CLOSED') {
        const reason = await this.rooms.closedReason(roomId);
        if (reason) socket.emit('room:closed', { roomId, reason });
      }
    }));
  }
}
