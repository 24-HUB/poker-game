import { Module } from '@nestjs/common';
import { ReleaseControlsModule } from '../../config/release-controls';
import { IdentityModule } from '../identity/identity.module';
import { TicketsModule } from '../tickets/tickets.module';
import { GachaModule } from '../gacha/gacha.module';
import { CollectionController } from './collection.controller';
import { CollectionRepository } from './collection.repository';
import { CollectionService } from './collection.service';

@Module({ imports: [IdentityModule, TicketsModule, GachaModule, ReleaseControlsModule], controllers: [CollectionController],
  providers: [CollectionRepository, CollectionService], exports: [CollectionRepository] })
export class CollectionModule {}
