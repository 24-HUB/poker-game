import { BadRequestException, Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { HttpSessionGuard, type AuthenticatedRequest } from '../../common/httpSessionGuard';
import { EconomyRateLimiter } from '../gacha/economyRateLimiter';
import { CollectionService } from './collection.service';

@Controller('api')
@UseGuards(HttpSessionGuard)
export class CollectionController {
  public constructor(private readonly collection: CollectionService, private readonly limiter: EconomyRateLimiter) {}
  @Get('collection')
  public async owned(@Req() request: AuthenticatedRequest, @Query('after') after?: unknown) {
    if (after !== undefined && (typeof after !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(after))) throw new BadRequestException('Invalid collection cursor.');
    return { data: await this.collection.collection(request.verifiedIdentity.accountId, after as string | undefined), error: null };
  }
  @Get('equipment')
  public async equipment(@Req() request: AuthenticatedRequest) { return { data: await this.collection.equipment(request.verifiedIdentity.accountId), error: null }; }
  @Put('equipment/:slot')
  public async equip(@Req() request: AuthenticatedRequest, @Param('slot') slot: string, @Body() body: unknown) {
    const { cosmeticSlotSchema, equipmentUpdateSchema } = await import('@poker/contracts');
    const parsedSlot = cosmeticSlotSchema.safeParse(slot);
    const parsed = equipmentUpdateSchema.safeParse(body);
    if (!parsedSlot.success || !parsed.success) throw new BadRequestException('Invalid equipment selection.');
    this.limiter.allow(request.verifiedIdentity.accountId);
    return { data: await this.collection.equip(request.verifiedIdentity.accountId, parsedSlot.data, parsed.data.itemId, parsed.data.expectedRevision), error: null };
  }
}
