import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { HttpSessionGuard, type AuthenticatedRequest } from '../../common/httpSessionGuard';
import { RoomService } from './room.service';

@Controller('api/rooms')
@UseGuards(HttpSessionGuard)
export class CurrentRoomController {
  public constructor(private readonly rooms: RoomService) {}

  @Get('current')
  @Header('Cache-Control', 'no-store')
  public async current(@Req() request: AuthenticatedRequest) {
    return { data: await this.rooms.currentRoom(request.verifiedIdentity.accountId), error: null };
  }
}
