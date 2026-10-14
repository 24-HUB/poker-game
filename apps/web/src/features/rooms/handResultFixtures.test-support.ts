import type { CommittedHandResult } from '@poker/contracts';

export const showdownResult: CommittedHandResult = {
  handId: 'hand-a', sessionId: 'session-a', handNumber: 5, completedAt: '2026-10-14T10:00:00Z', completedDateUtc: '2026-10-14', rulesVersion: 1,
  contributions: [{ accountId: 'host', amount: 776 }, { accountId: 'guest', amount: 776 }],
  payouts: [{ accountId: 'host', amount: 1552 }, { accountId: 'guest', amount: 0 }],
  finalStacks: [{ accountId: 'host', amount: 1776 }, { accountId: 'guest', amount: 224 }],
  manualActionAccountIds: ['host', 'guest'], winners: ['host'],
  revealedCards: [{ accountId: 'host', cards: [51, 38] }, { accountId: 'guest', cards: [50, 49] }],
  presentation: {
    version: 1, outcomeReason: 'showdown', board: [25, 11, 32, 42, 13],
    participants: [{ accountId: 'host', displayName: 'REI', seat: 0, folded: false }, { accountId: 'guest', displayName: 'WC', seat: 1, folded: false }],
    rankings: [
      { accountId: 'host', rank: { category: 3, tiebreak: [14, 13, 8] }, handName: 'Three of a kind, aces', bestFive: [25, 51, 38, 11, 32], combinationCards: [25, 51, 38], kickers: [13, 8], playsBoard: false },
      { accountId: 'guest', rank: { category: 1, tiebreak: [13, 14, 12, 8] }, handName: 'Pair of kings', bestFive: [11, 50, 25, 49, 32], combinationCards: [11, 50], kickers: [14, 12, 8], playsBoard: false },
    ],
    pots: [{ amount: 1552, eligibleAccountIds: ['host', 'guest'], winners: ['host'], payouts: [{ accountId: 'host', amount: 1552 }] }], uncalledReturns: [],
  },
};
