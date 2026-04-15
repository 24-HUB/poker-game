import { Card, Rank } from '../types/game';

/**
 * Hand ranking levels in Texas Hold'em.
 */
export enum HandRank {
  high_card = 1,
  one_pair = 2,
  two_pair = 3,
  three_of_a_kind = 4,
  straight = 5,
  flush = 6,
  full_house = 7,
  four_of_a_kind = 8,
  straight_flush = 9,
  royal_flush = 10,
}

/**
 * Result of evaluating a poker hand.
 */
export interface HandResult {
  rank: HandRank;
  score: number;
  tiebreakers: number[];
  bestCards: Card[];
}

const rankToValue: Record<Rank, number> = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/**
 * Evaluates the best 5-card hand from a pool of 5 to 7 cards.
 */
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) throw new Error('Hand must have at least 5 cards');

  const sorted = [...cards].sort((a, b) => rankToValue[b.rank] - rankToValue[a.rank]);
  
  // 1. Straight Flush / Royal Flush
  const flushSuit = getFlushSuit(sorted);
  if (flushSuit) {
    const flushCards = sorted.filter(c => c.suit === flushSuit);
    const straightFlush = getStraight(flushCards);
    if (straightFlush) {
      const isRoyal = straightFlush[0].rank === 'A';
      return {
        rank: isRoyal ? HandRank.royal_flush : HandRank.straight_flush,
        score: isRoyal ? 10 : 9,
        tiebreakers: [rankToValue[straightFlush[0].rank]],
        bestCards: straightFlush,
      };
    }
  }

  // Group cards by rank
  const groups: Map<number, Card[]> = new Map();
  for (const card of sorted) {
    const val = rankToValue[card.rank];
    if (!groups.has(val)) groups.set(val, []);
    groups.get(val)!.push(card);
  }
  const groupCounts = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);

  // 2. Four of a kind
  if (groupCounts[0][1].length === 4) {
    const fourCards = groupCounts[0][1];
    const kicker = sorted.find(c => rankToValue[c.rank] !== groupCounts[0][0])!;
    return {
      rank: HandRank.four_of_a_kind,
      score: 8,
      tiebreakers: [groupCounts[0][0], rankToValue[kicker.rank]],
      bestCards: [...fourCards, kicker],
    };
  }

  // 3. Full House
  const threeGroup = groupCounts.find(g => g[1].length === 3);
  const pairGroup = groupCounts.find(g => g[1].length >= 2 && g[0] !== threeGroup?.[0]);
  if (threeGroup && pairGroup) {
    return {
      rank: HandRank.full_house,
      score: 7,
      tiebreakers: [threeGroup[0], pairGroup[0]],
      bestCards: [...threeGroup[1], ...pairGroup[1].slice(0, 2)],
    };
  }

  // 4. Flush
  if (flushSuit) {
    const bestFlush = sorted.filter(c => c.suit === flushSuit).slice(0, 5);
    return {
      rank: HandRank.flush,
      score: 6,
      tiebreakers: bestFlush.map(c => rankToValue[c.rank]),
      bestCards: bestFlush,
    };
  }

  // 5. Straight
  const straightCards = getStraight(sorted);
  if (straightCards) {
    return {
      rank: HandRank.straight,
      score: 5,
      tiebreakers: [rankToValue[straightCards[0].rank]],
      bestCards: straightCards,
    };
  }

  // 6. Three of a kind
  if (groupCounts[0][1].length === 3) {
    const threeCards = groupCounts[0][1];
    const kickers = sorted.filter(c => rankToValue[c.rank] !== groupCounts[0][0]).slice(0, 2);
    return {
      rank: HandRank.three_of_a_kind,
      score: 4,
      tiebreakers: [groupCounts[0][0], ...kickers.map(c => rankToValue[c.rank])],
      bestCards: [...threeCards, ...kickers],
    };
  }

  // 7. Two Pair
  const pair1 = groupCounts.find(g => g[1].length === 2);
  const pair2 = groupCounts.find(g => g[1].length === 2 && g[0] !== pair1?.[0]);
  if (pair1 && pair2) {
    const kicker = sorted.find(c => rankToValue[c.rank] !== pair1[0] && rankToValue[c.rank] !== pair2[0])!;
    return {
      rank: HandRank.two_pair,
      score: 3,
      tiebreakers: [pair1[0], pair2[0], rankToValue[kicker.rank]],
      bestCards: [...pair1[1], ...pair2[1], kicker],
    };
  }

  // 8. One Pair
  if (groupCounts[0][1].length === 2) {
    const pairCards = groupCounts[0][1];
    const kickers = sorted.filter(c => rankToValue[c.rank] !== groupCounts[0][0]).slice(0, 3);
    return {
      rank: HandRank.one_pair,
      score: 2,
      tiebreakers: [groupCounts[0][0], ...kickers.map(c => rankToValue[c.rank])],
      bestCards: [...pairCards, ...kickers],
    };
  }

  // 9. High Card
  const highCards = sorted.slice(0, 5);
  return {
    rank: HandRank.high_card,
    score: 1,
    tiebreakers: highCards.map(c => rankToValue[c.rank]),
    bestCards: highCards,
  };
}

function getFlushSuit(cards: Card[]): string | null {
  const counts: Record<string, number> = {};
  for (const c of cards) {
    counts[c.suit] = (counts[c.suit] || 0) + 1;
    if (counts[c.suit] >= 5) return c.suit;
  }
  return null;
}

function getStraight(cards: Card[]): Card[] | null {
  const unique = Array.from(new Set(cards.map(c => rankToValue[c.rank])))
    .sort((a, b) => b - a);

  // Normal straight
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) {
      const bestFive = unique.slice(i, i + 5);
      return bestFive.map(v => cards.find(c => rankToValue[c.rank] === v)!);
    }
  }

  // Wheel (A-2-3-4-5)
  if (unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
    const wheelRanks = [5, 4, 3, 2, 14];
    return wheelRanks.map(v => cards.find(c => rankToValue[c.rank] === v)!);
  }

  return null;
}

/**
 * Compares two hands. Returns 1 if a wins, -1 if b wins, 0 if tie.
 */
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank > b.rank) return 1;
  if (b.rank > a.rank) return -1;

  for (let i = 0; i < a.tiebreakers.length; i++) {
    if (a.tiebreakers[i] > b.tiebreakers[i]) return 1;
    if (b.tiebreakers[i] > a.tiebreakers[i]) return -1;
  }

  return 0;
}

/**
 * Finds the winners among multiple players.
 */
export function findWinner(hands: Map<string, Card[]>, community: Card[]): string[] {
  const evaluated = Array.from(hands.entries()).map(([id, holeCards]) => ({
    id,
    result: evaluateHand([...holeCards, ...community]),
  }));

  let winners: typeof evaluated = [evaluated[0]];

  for (let i = 1; i < evaluated.length; i++) {
    const comparison = compareHands(evaluated[i].result, winners[0].result);
    if (comparison === 1) {
      winners = [evaluated[i]];
    } else if (comparison === 0) {
      winners.push(evaluated[i]);
    }
  }

  return winners.map(w => w.id);
}
