import { describe, expect, it } from 'vitest';

import { settlePots } from './pots.js';

const rank = (category: number) => ({ category, tiebreak: [category] });

describe('pot settlement', () => {
  it('returnsUncalledExcess', () => {
    const result = settlePots({ buttonSeat: 0, seats: [
      { accountId: 'a', seat: 0, contribution: 100, folded: false, rank: rank(1) },
      { accountId: 'b', seat: 1, contribution: 60, folded: false, rank: rank(2) },
      { accountId: 'c', seat: 2, contribution: 20, folded: false, rank: rank(3) },
    ] });
    expect(result.uncalledReturns).toEqual([{ accountId: 'a', amount: 40 }]);
    expect(result.pots.map((pot) => pot.amount)).toEqual([60, 80]);
    expect(result.totalPayouts).toEqual({ a: 40, b: 80, c: 60 });
    expect(Object.values(result.totalPayouts).reduce((sum, value) => sum + value, 0)).toBe(180);
  });

  it('excludes folded contributors and awards odd chips clockwise left of button', () => {
    const result = settlePots({ buttonSeat: 0, seats: [
      { accountId: 'a', seat: 0, contribution: 5, folded: true, rank: null },
      { accountId: 'b', seat: 1, contribution: 5, folded: false, rank: rank(2) },
      { accountId: 'c', seat: 2, contribution: 5, folded: false, rank: rank(2) },
    ] });
    expect(result.pots[0]?.eligibleAccountIds).toEqual(['b', 'c']);
    expect(result.pots[0]?.winners).toEqual(['b', 'c']);
    expect(result.totalPayouts).toEqual({ a: 0, b: 8, c: 7 });
  });
});
