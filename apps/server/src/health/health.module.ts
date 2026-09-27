import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { HealthController, ReadinessController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [DatabaseModule, AuthorityModule],
  controllers: [HealthController, ReadinessController],
  providers: [HealthService],
})
export class HealthModule {}
