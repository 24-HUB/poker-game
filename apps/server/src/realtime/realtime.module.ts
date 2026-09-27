import { Module } from '@nestjs/common';

import { SocketSessionGuard } from '../common/socketSessionGuard';
import { IdentityModule } from '../modules/identity/identity.module';
import { ConnectionGateway } from './connection.gateway';
import { GameGateway } from './game.gateway';

@Module({ imports: [IdentityModule], providers: [ConnectionGateway, GameGateway, SocketSessionGuard] })
export class RealtimeModule {}
