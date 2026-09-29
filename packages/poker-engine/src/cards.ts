import type { Card } from './types.js';

export const CARD_COUNT = 52;
const SUITS = ['♣', '♦', '♥', '♠'] as const;
const RANKS = '23456789TJQKA';

export function assertCard(card: number): asserts card is Card {
  if (!Number.isInteger(card) || card < 0 || card >= CARD_COUNT) throw new RangeError('Invalid card');
}

export function assertUniqueCards(cards: readonly number[]): asserts cards is readonly Card[] {
  const seen = new Set<number>();
  for (const card of cards) {
    assertCard(card);
    if (seen.has(card)) throw new RangeError('Duplicate card');
    seen.add(card);
  }
}

export function assertDeck(deck: readonly number[]): asserts deck is readonly Card[] {
  if (deck.length !== CARD_COUNT) throw new RangeError('Deck must contain 52 cards');
  assertUniqueCards(deck);
}

export function cardRank(card: Card): number {
  assertCard(card);
  return card % 13 + 2;
}

export function cardSuit(card: Card): number {
  assertCard(card);
  return Math.floor(card / 13);
}

export function cardLabel(card: Card): string {
  return `${RANKS[cardRank(card) - 2]}${SUITS[cardSuit(card)]}`;
}
