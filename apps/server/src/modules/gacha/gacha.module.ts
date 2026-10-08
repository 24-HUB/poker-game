import { Module } from '@nestjs/common';
import { ReleaseControlsModule } from '../../config/release-controls';
import { IdentityModule } from '../identity/identity.module';
import { TicketsModule } from '../tickets/tickets.module';
import { EconomyRateLimiter } from './economyRateLimiter';
import { GachaController } from './gacha.controller';
import { GachaRepository } from './gacha.repository';
import { GachaService } from './gacha.service';

@Module({ imports: [IdentityModule, TicketsModule, ReleaseControlsModule], controllers: [GachaController],
  providers: [GachaRepository, GachaService, EconomyRateLimiter], exports: [GachaRepository, EconomyRateLimiter] })
export class GachaModule {}
