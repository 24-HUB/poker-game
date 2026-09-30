import { assertUniqueCards, cardRank, cardSuit } from './cards.js';
import type { Card, HandRank } from './types.js';

function straightHigh(ranks: readonly number[]): number | null {
  const unique = new Set(ranks);
  if (unique.has(14)) unique.add(1);
  for (let high = 14; high >= 5; high -= 1) {
    if ([0, 1, 2, 3, 4].every((offset) => unique.has(high - offset))) return high;
  }
  return null;
}

function evaluateFive(cards: readonly Card[]): HandRank {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const groups = [...new Set(ranks)]
    .map((rank) => ({ rank, count: ranks.filter((value) => value === rank).length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const flush = cards.every((card) => cardSuit(card) === cardSuit(cards[0]!));
  const straight = straightHigh(ranks);
  if (flush && straight !== null) return { category: 8, tiebreak: [straight] };
  if (groups[0]?.count === 4) return { category: 7, tiebreak: [groups[0].rank, groups[1]!.rank] };
  if (groups[0]?.count === 3 && groups[1]?.count === 2) return { category: 6, tiebreak: [groups[0].rank, groups[1].rank] };
  if (flush) return { category: 5, tiebreak: ranks };
  if (straight !== null) return { category: 4, tiebreak: [straight] };
  if (groups[0]?.count === 3) return { category: 3, tiebreak: [groups[0].rank, ...groups.slice(1).map((group) => group.rank)] };
  if (groups[0]?.count === 2 && groups[1]?.count === 2) return { category: 2, tiebreak: [groups[0].rank, groups[1].rank, groups[2]!.rank] };
  if (groups[0]?.count === 2) return { category: 1, tiebreak: [groups[0].rank, ...groups.slice(1).map((group) => group.rank)] };
  return { category: 0, tiebreak: ranks };
}

export function compareRanks(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return Math.sign(a.category - b.category);
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i += 1) {
    const difference = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

export function evaluateSeven(cards: readonly Card[]): HandRank {
  if (cards.length !== 7) throw new RangeError('Seven cards required');
  assertUniqueCards(cards);
  let best: HandRank | null = null;
  for (let a = 0; a < 3; a += 1) {
    for (let b = a + 1; b < 4; b += 1) {
      for (let c = b + 1; c < 5; c += 1) {
        for (let d = c + 1; d < 6; d += 1) {
          for (let e = d + 1; e < 7; e += 1) {
            const rank = evaluateFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (!best || compareRanks(rank, best) > 0) best = rank;
          }
        }
      }
    }
  }
  return best!;
}
