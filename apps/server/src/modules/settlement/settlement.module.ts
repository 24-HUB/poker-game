import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { SettlementRepository } from './settlement.repository';
import { SettlementService } from './settlement.service';

@Module({
  imports: [AuthorityModule],
  providers: [SettlementRepository, SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
