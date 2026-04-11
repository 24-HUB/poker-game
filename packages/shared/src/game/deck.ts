import { Card, Suit, Rank } from '../types/game';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

/**
 * Creates a standard 52-card deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Shuffles a deck using the Fisher-Yates algorithm.
 * Pure function: returns a new shuffled array.
 * @param deck The deck to shuffle.
 * @param seed Optional seed for deterministic shuffling (for testing).
 */
export function shuffle(deck: Card[], seed?: number): Card[] {
  const shuffled = [...deck];
  const random = seed !== undefined 
    ? () => {
        let s = seed as number;
        const x = Math.sin(s++) * 10000;
        seed = s;
        return x - Math.floor(x);
      }
    : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
