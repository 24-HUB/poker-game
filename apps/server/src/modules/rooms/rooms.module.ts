import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { CryptoDeckFactory, DECK_FACTORY } from '../../infrastructure/deckFactory';
import { GAME_CLOCK, SystemGameClock } from '../../infrastructure/gameClock';
import { IdentityModule } from '../identity/identity.module';
import { GameCommandCache } from './gameCommandCache';
import { GameService } from './game.service';
import { RoomCommandCache } from './roomCommandCache';
import { RoomRepository } from './room.repository';
import { RoomRegistry } from './roomRegistry';
import { ROOM_SERVICE_OPTIONS, RoomService } from './room.service';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

@Module({
  imports: [AuthorityModule, IdentityModule],
  providers: [
    RoomRepository,
    SessionRepository,
    SessionService,
    GameCommandCache,
    GameService,
    { provide: GAME_CLOCK, useClass: SystemGameClock },
    { provide: DECK_FACTORY, useClass: CryptoDeckFactory },
    RoomRegistry,
    RoomCommandCache,
    { provide: ROOM_SERVICE_OPTIONS, useValue: {} },
    RoomService,
  ],
  exports: [RoomService, SessionService, GameService, RoomRegistry],
})
export class RoomsModule {}
