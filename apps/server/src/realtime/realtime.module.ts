import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { SocketSessionGuard } from '../common/socketSessionGuard';
import { IdentityModule } from '../modules/identity/identity.module';
import { RoomsModule } from '../modules/rooms/rooms.module';
import { CommandRateLimiter } from './commandRateLimiter';
import { ConnectionGateway } from './connection.gateway';
import { GameGateway } from './game.gateway';
import { RoomPublisher } from './roomPublisher';

@Module({
  imports: [AuthorityModule, IdentityModule, RoomsModule],
  providers: [ConnectionGateway, GameGateway, SocketSessionGuard, CommandRateLimiter, RoomPublisher],
})
export class RealtimeModule {}
