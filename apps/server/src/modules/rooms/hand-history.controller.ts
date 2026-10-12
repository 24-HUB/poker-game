import { BadRequestException, Controller, Get, Header, Param, Query, Req, UseGuards } from '@nestjs/common';
import { HttpSessionGuard, type AuthenticatedRequest } from '../../common/httpSessionGuard';
import { GameService } from './game.service';

@Controller('api/rooms')
@UseGuards(HttpSessionGuard)
export class HandHistoryController {
  public constructor(private readonly game: GameService) {}

  @Get(':roomId/hands')
  @Header('Cache-Control', 'no-store')
  public async history(@Req() request: AuthenticatedRequest, @Param('roomId') roomId: string,
    @Query('sessionId') sessionId: unknown, @Query('beforeHandNumber') before: unknown) {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128 || roomId.length > 128 ||
      (before !== undefined && (typeof before !== 'string' || !/^[1-9]\d*$/.test(before) || !Number.isSafeInteger(Number(before))))) {
      throw new BadRequestException('A valid session and optional hand cursor are required.');
    }
    return { data: await this.game.history(request.verifiedIdentity.accountId, roomId, sessionId,
      before === undefined ? undefined : Number(before)), error: null };
  }
}
