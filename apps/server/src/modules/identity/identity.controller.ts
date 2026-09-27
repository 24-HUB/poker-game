import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { HttpSessionGuard, type AuthenticatedRequest } from '../../common/httpSessionGuard';

@Controller('api')
export class IdentityController {
  @Get('me')
  @UseGuards(HttpSessionGuard)
  public me(@Req() request: AuthenticatedRequest) {
    const resolved = request.verifiedIdentity;
    return {
      data: { accountId: resolved.accountId, displayName: resolved.displayName },
      error: null,
    };
  }
}
