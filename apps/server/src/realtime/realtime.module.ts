import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { SocketSessionGuard } from '../common/socketSessionGuard';
import { IdentityModule } from '../modules/identity/identity.module';
import { RoomsModule } from '../modules/rooms/rooms.module';
import { CommandRateLimiter } from './commandRateLimiter';
import { ConnectionGateway } from './connection.gateway';
import { GameGateway } from './game.gateway';
import { RoomPublisher } from './roomPublisher';
import { AccountPublisher } from './accountPublisher';
import { TicketsModule } from '../modules/tickets/tickets.module';

@Module({
  imports: [AuthorityModule, IdentityModule, RoomsModule, TicketsModule],
  providers: [ConnectionGateway, GameGateway, SocketSessionGuard, CommandRateLimiter, RoomPublisher, AccountPublisher],
})
export class RealtimeModule {}
