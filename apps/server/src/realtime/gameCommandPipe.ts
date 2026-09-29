import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { GameCommand } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { z } from 'zod';

const identifier = z.string().min(1).max(128);
const metadata = { commandId: z.uuid(), authorityBootId: identifier, issuedAt: z.iso.datetime(),
  roomId: identifier, controlEpoch: z.number().int().nonnegative() };
const action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fold') }).strict(), z.object({ type: z.literal('check') }).strict(),
  z.object({ type: z.literal('call') }).strict(),
  z.object({ type: z.literal('raise'), raiseTo: z.number().int().positive().safe() }).strict(),
]);
const schemas = {
  'session:start': z.object({ type: z.literal('session:start'), ...metadata }).strict(),
  'session:end': z.object({ type: z.literal('session:end'), ...metadata, sessionId: identifier }).strict(),
  'game:action': z.object({ type: z.literal('game:action'), ...metadata, sessionId: identifier,
    handId: identifier, expectedGameVersion: z.number().int().nonnegative().safe(), action }).strict(),
  'game:sync': z.object({ type: z.literal('game:sync'), roomId: identifier }).strict(),
};

export class GameCommandPipe implements PipeTransform<unknown, GameCommand> {
  public constructor(private readonly type: GameCommand['type']) {}

  public transform(value: unknown): GameCommand {
    const parsed = schemas[this.type].safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST', message: 'The socket payload is invalid.' });
    }
    return parsed.data;
  }
}
