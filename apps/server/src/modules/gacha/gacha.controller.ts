import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { HttpSessionGuard, type AuthenticatedRequest } from '../../common/httpSessionGuard';
import { EconomyRateLimiter } from './economyRateLimiter';
import { GachaService } from './gacha.service';

@Controller('api')
@UseGuards(HttpSessionGuard)
export class GachaController {
  public constructor(private readonly gacha: GachaService, private readonly limiter: EconomyRateLimiter) {}
  @Get('banner')
  public async banner() { return { data: await this.gacha.banner(), error: null }; }
  @Get('pulls/:requestId')
  public async receipt(@Req() request: AuthenticatedRequest, @Param('requestId') id: string) {
    if (!/^[a-f0-9-]{36}$/i.test(id)) throw new BadRequestException('Invalid request ID.');
    return { data: await this.gacha.receipt(request.verifiedIdentity.accountId, id), error: null };
  }
  @Post('pulls')
  public async pull(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const { pullRequestSchema } = await import('@poker/contracts');
    const parsed = pullRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid purchase request.');
    this.limiter.allow(request.verifiedIdentity.accountId);
    return { data: await this.gacha.pull(request.verifiedIdentity.accountId, parsed.data), error: null };
  }
}
