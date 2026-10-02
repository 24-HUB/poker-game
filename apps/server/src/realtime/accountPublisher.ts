import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

import { IdentityService, toWebHeaders } from '../modules/identity/identity.service';
import { GameService } from '../modules/rooms/game.service';
import { TicketsRepository } from '../modules/tickets/tickets.repository';
import { AccountChanges } from '../modules/tickets/accountChanges';

@Injectable()
export class AccountPublisher {
  private server: Server | null = null;

  public constructor(
    private readonly identity: IdentityService,
    private readonly games: GameService,
    private readonly tickets: TicketsRepository,
    changes: AccountChanges,
  ) {
    this.games.subscribeRewards((accountIds) => { void this.publishAfterCommit(accountIds).catch(() => undefined); });
    changes.subscribe((accountId, revision) => this.changed(accountId, revision));
  }

  public attach(server: Server): void { this.server = server; }

  private async publishAfterCommit(accountIds: string[]): Promise<void> {
    for (const accountId of accountIds) {
      const revision = await this.tickets.walletRevision(accountId);
      if (revision !== null) await this.changed(accountId, revision);
    }
  }

  public async changed(accountId: string, revision: number): Promise<void> {
    if (!this.server) return;
    for (const socket of this.server.sockets.sockets.values()) {
      let resolved;
      try { resolved = await this.identity.resolve(toWebHeaders(socket.handshake.headers)); }
      catch { continue; }
      if (!resolved) {
        socket.disconnect(true);
        continue;
      }
      if (resolved.accountId === accountId) socket.emit('account:changed', { revision });
    }
  }
}
