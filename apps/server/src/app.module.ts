import { Module } from '@nestjs/common';

import { AuthorityModule } from './authority/authority.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({ imports: [DatabaseModule, AuthorityModule, HealthModule, IdentityModule, TicketsModule, RoomsModule, RealtimeModule] })
export class AppModule {}
