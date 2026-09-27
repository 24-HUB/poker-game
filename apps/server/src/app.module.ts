import { Module } from '@nestjs/common';

import { AuthorityModule } from './authority/authority.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({ imports: [DatabaseModule, AuthorityModule, HealthModule, RealtimeModule] })
export class AppModule {}
