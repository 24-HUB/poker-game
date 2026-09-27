import { Module } from '@nestjs/common';

import { AuthorityModule } from './authority/authority.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({ imports: [DatabaseModule, AuthorityModule, HealthModule, IdentityModule, RealtimeModule] })
export class AppModule {}
