import { Module } from '@nestjs/common';

import { TicketsRepository } from './tickets.repository';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { IdentityModule } from '../identity/identity.module';
import { AccountChanges } from './accountChanges';

@Module({
  imports: [IdentityModule], controllers: [TicketsController],
  providers: [TicketsRepository, TicketsService, AccountChanges], exports: [TicketsRepository, TicketsService, AccountChanges],
})
export class TicketsModule {}
