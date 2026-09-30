import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { HttpSessionGuard, type AuthenticatedRequest } from '../../common/httpSessionGuard';
import { TicketsService } from './tickets.service';

@Controller('api')
export class TicketsController {
  public constructor(private readonly tickets: TicketsService) {}

  @Get('wallet')
  @UseGuards(HttpSessionGuard)
  public async wallet(@Req() request: AuthenticatedRequest) {
    return { data: await this.tickets.getWallet(request.verifiedIdentity.accountId, new Date()), error: null };
  }
}
