import { describe, expect, it } from 'vitest';

import { compareRanks, evaluateSeven } from './evaluate.js';

// Each suit occupies thirteen consecutive cards; ranks are 2 through 14.
const c = (rank: number, suit: number) => suit * 13 + rank - 2;

describe('seven-card ranking', () => {
  it('wheelLosesToSixHighStraight', () => {
    const wheel = evaluateSeven([c(14, 0), c(2, 1), c(3, 2), c(4, 3), c(5, 0), c(9, 1), c(10, 2)]);
    const sixHigh = evaluateSeven([c(2, 0), c(3, 1), c(4, 2), c(5, 3), c(6, 0), c(9, 2), c(10, 1)]);
    expect(compareRanks(wheel, sixHigh)).toBeLessThan(0);
  });

  it('boardTieIgnoresUnusedHoleCard', () => {
    const board = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)];
    const first = evaluateSeven([...board, c(2, 1), c(3, 2)]);
    const second = evaluateSeven([...board, c(9, 3), c(8, 2)]);
    expect(compareRanks(first, second)).toBe(0);
  });

  it('orders all nine categories', () => {
    const hands = [
      [c(2, 0), c(5, 1), c(7, 2), c(9, 3), c(11, 0), c(13, 1), c(14, 2)],
      [c(2, 0), c(2, 1), c(7, 2), c(9, 3), c(11, 0), c(13, 1), c(14, 2)],
      [c(2, 0), c(2, 1), c(7, 2), c(7, 3), c(11, 0), c(13, 1), c(14, 2)],
      [c(2, 0), c(2, 1), c(2, 2), c(9, 3), c(11, 0), c(13, 1), c(14, 2)],
      [c(5, 0), c(6, 1), c(7, 2), c(8, 3), c(9, 0), c(13, 1), c(14, 2)],
      [c(2, 0), c(5, 0), c(7, 0), c(9, 0), c(11, 0), c(13, 1), c(14, 2)],
      [c(2, 0), c(2, 1), c(2, 2), c(9, 3), c(9, 0), c(13, 1), c(14, 2)],
      [c(2, 0), c(2, 1), c(2, 2), c(2, 3), c(9, 0), c(13, 1), c(14, 2)],
      [c(5, 0), c(6, 0), c(7, 0), c(8, 0), c(9, 0), c(13, 1), c(14, 2)],
    ];
    const ranks = hands.map(evaluateSeven);
    expect(ranks.map((rank) => rank.category)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (let i = 1; i < ranks.length; i += 1) {
      expect(compareRanks(ranks[i]!, ranks[i - 1]!)).toBeGreaterThan(0);
    }
  });

  it('rejects duplicate and out-of-range cards', () => {
    expect(() => evaluateSeven([0, 0, 2, 3, 4, 5, 6])).toThrow();
    expect(() => evaluateSeven([0, 1, 2, 3, 4, 5, 52])).toThrow();
  });
});
