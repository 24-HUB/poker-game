import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { RoomCommand, RoomCommandType } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { z } from 'zod';

const identifier = z.string().min(1).max(128);
const metadata = { commandId: z.uuid(), authorityBootId: identifier, issuedAt: z.iso.datetime() };
const schemas = {
  'room:create': z.object({ type: z.literal('room:create'), title: z.string().trim().min(1).max(24), ...metadata }).strict(),
  'room:join': z.object({ type: z.literal('room:join'), token: z.string().min(1).max(512), ...metadata }).strict(),
  'room:sync': z.object({ type: z.literal('room:sync'), roomId: identifier }).strict(),
  'room:takeSeat': z.object({ type: z.literal('room:takeSeat'), roomId: identifier, seat: z.number().int().min(0).max(5), controlEpoch: z.number().int().nonnegative(), ...metadata }).strict(),
  'room:leave': z.object({ type: z.literal('room:leave'), roomId: identifier, controlEpoch: z.number().int().nonnegative(), ...metadata }).strict(),
  'room:rotateInvite': z.object({ type: z.literal('room:rotateInvite'), roomId: identifier, controlEpoch: z.number().int().nonnegative(), ...metadata }).strict(),
  'room:claimControl': z.object({ type: z.literal('room:claimControl'), roomId: identifier, ...metadata }).strict(),
} satisfies Record<RoomCommandType, z.ZodType>;

export class RoomCommandPipe implements PipeTransform<unknown, RoomCommand> {
  public constructor(private readonly type: RoomCommandType) {}

  public transform(value: unknown): RoomCommand {
    const parsed = schemas[this.type].safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST', message: 'The socket payload is invalid.' });
    }
    return parsed.data as RoomCommand;
  }
}
