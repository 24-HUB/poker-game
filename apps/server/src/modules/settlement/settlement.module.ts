import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { SettlementRepository } from './settlement.repository';
import { SettlementService } from './settlement.service';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [AuthorityModule, TicketsModule],
  providers: [SettlementRepository, SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
