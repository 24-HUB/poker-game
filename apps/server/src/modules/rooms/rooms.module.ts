import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { RoomCommandCache } from './roomCommandCache';
import { RoomRepository } from './room.repository';
import { RoomRegistry } from './roomRegistry';
import { ROOM_SERVICE_OPTIONS, RoomService } from './room.service';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

@Module({
  imports: [AuthorityModule],
  providers: [
    RoomRepository,
    SessionRepository,
    SessionService,
    RoomRegistry,
    RoomCommandCache,
    { provide: ROOM_SERVICE_OPTIONS, useValue: {} },
    RoomService,
  ],
  exports: [RoomService, SessionService, RoomRegistry],
})
export class RoomsModule {}
