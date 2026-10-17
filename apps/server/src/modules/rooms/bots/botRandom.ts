import { randomInt } from 'node:crypto';

export const BOT_RANDOM = Symbol('BOT_RANDOM');
export type BotRandom = { next(): number };
export class CryptoBotRandom implements BotRandom {
  public next(): number { return randomInt(0, 2 ** 32) / 2 ** 32; }
}
