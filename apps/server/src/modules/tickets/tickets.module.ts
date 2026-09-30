import { Module } from '@nestjs/common';

import { TicketsRepository } from './tickets.repository';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule], controllers: [TicketsController],
  providers: [TicketsRepository, TicketsService], exports: [TicketsRepository, TicketsService],
})
export class TicketsModule {}
