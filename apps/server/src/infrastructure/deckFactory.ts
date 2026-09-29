import { randomInt } from 'node:crypto';

import type { Card } from '@poker/poker-engine' with { 'resolution-mode': 'import' };

export type DeckFactory = { shuffle(): readonly Card[] };
export const DECK_FACTORY = Symbol('DECK_FACTORY');

export class CryptoDeckFactory implements DeckFactory {
  public shuffle(): readonly Card[] {
    const deck = Array.from({ length: 52 }, (_, card) => card);
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swap = randomInt(index + 1);
      [deck[index], deck[swap]] = [deck[swap]!, deck[index]!];
    }
    return deck;
  }
}
