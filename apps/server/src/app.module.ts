import { Module } from '@nestjs/common';

import { AuthorityModule } from './authority/authority.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [DatabaseModule, AuthorityModule, HealthModule] })
export class AppModule {}
