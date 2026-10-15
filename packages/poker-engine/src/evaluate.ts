import { assertUniqueCards, cardRank, cardSuit } from './cards.js';
import type { Card, HandRank, HandDetail } from './types.js';

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
  return evaluateSevenDetailed(cards).rank;
}

/** First equal combination in input order wins; the settlement supplies the board first. */
export function evaluateSevenDetailed(cards: readonly Card[]): HandDetail {
  if (cards.length !== 7) throw new RangeError('Seven cards required');
  return evaluateCardsDetailed(cards);
}

/** Evaluate a made hand using only currently visible cards (flop through river). */
export function evaluateCards(cards: readonly Card[]): HandRank {
  return evaluateCardsDetailed(cards).rank;
}

function evaluateCardsDetailed(cards: readonly Card[]): HandDetail {
  if (cards.length < 5 || cards.length > 7) throw new RangeError('Five to seven cards required');
  assertUniqueCards(cards);
  let best: HandRank | null = null;
  let bestFive: Card[] = [];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const selection = [cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!];
            const rank = evaluateFive(selection);
            if (!best || compareRanks(rank, best) > 0) { best = rank; bestFive = selection; }
          }
        }
      }
    }
  }
  const rank = best!;
  const names = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
  const singular = (value: number) => names[value - 2]!;
  const plural = (value: number) => value === 6 ? 'sixes' : `${singular(value)}s`;
  const counts = new Map(bestFive.map((card) => [cardRank(card), bestFive.filter((other) => cardRank(other) === cardRank(card)).length]));
  bestFive.sort((a, b) => counts.get(cardRank(b))! - counts.get(cardRank(a))! || cardRank(b) - cardRank(a));
  const [first, second] = rank.tiebreak as readonly number[];
  const handName = [
    `High card, ${singular(first!)}`, `Pair of ${plural(first!)}`,
    `Two pair, ${plural(first!)} and ${plural(second!)}`, `Three of a kind, ${plural(first!)}`,
    `Straight, ${singular(first!)} high`, `Flush, ${singular(first!)} high`,
    `Full house, ${plural(first!)} over ${plural(second!)}`, `Four of a kind, ${plural(first!)}`,
    `Straight flush, ${singular(first!)} high`,
  ][rank.category]!;
  const combinationCards = [1, 2, 3, 6, 7].includes(rank.category)
    ? bestFive.filter((card) => counts.get(cardRank(card))! > 1) : [...bestFive];
  const kickerStart: Record<number, number> = { 1: 1, 2: 2, 3: 1, 7: 1 };
  const kickers = kickerStart[rank.category] === undefined ? [] : [...rank.tiebreak.slice(kickerStart[rank.category])];
  return { rank, handName, bestFive, combinationCards, kickers };
}
