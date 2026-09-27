import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { RoomCommandCache } from './roomCommandCache';
import { RoomRepository } from './room.repository';
import { RoomRegistry } from './roomRegistry';
import { ROOM_SERVICE_OPTIONS, RoomService } from './room.service';

@Module({
  imports: [AuthorityModule],
  providers: [
    RoomRepository,
    RoomRegistry,
    RoomCommandCache,
    { provide: ROOM_SERVICE_OPTIONS, useValue: {} },
    RoomService,
  ],
  exports: [RoomService],
})
export class RoomsModule {}
