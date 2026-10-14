// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { HandResultPanel } from './HandResultPanel';
import { showdownResult } from './handResultFixtures.test-support';

afterEach(cleanup);
it('explains the reference showdown with best five, award, net and final stack', () => {
  render(<HandResultPanel result={showdownResult} />);
  expect(screen.getByRole('heading', { name: 'Hand 5 result' })).toBeVisible();
  const winner = screen.getByRole('article', { name: 'REI result' });
  expect(within(winner).getByText('Three of a kind, aces')).toBeVisible();
  expect(within(winner).getByText('Awarded 1,552 chips')).toBeVisible();
  expect(within(winner).getByText('Net +776')).toBeVisible();
  expect(within(winner).getByText('Stack 1,776')).toBeVisible();
  expect(within(winner).getAllByLabelText(/ of /)).toHaveLength(5);
  expect(winner.querySelectorAll('.poker-card--combination')).toHaveLength(3);
  expect(screen.getAllByRole('img', { name: 'Ace of spades' })).toHaveLength(1);
});
it('shows concealed fold cards and separately labels an uncalled return', () => {
  const result = { ...showdownResult, revealedCards: [], payouts: [{ accountId: 'host', amount: 1552 }, { accountId: 'guest', amount: 0 }],
    presentation: { ...showdownResult.presentation!, outcomeReason: 'fold' as const, rankings: [], board: [25, 11, 32],
      pots: [{ amount: 1500, eligibleAccountIds: ['host'], winners: ['host'], payouts: [{ accountId: 'host', amount: 1500 }] }], uncalledReturns: [{ accountId: 'host', amount: 52 }] } };
  render(<HandResultPanel result={result} />);
  expect(screen.getByText('Won by fold')).toBeVisible();
  expect(screen.getByText('All opponents folded · No showdown')).toBeVisible();
  expect(screen.getByText('Awarded 1,500 chips')).toBeVisible();
  expect(screen.getByText('Returned 52 chips')).toBeVisible();
  expect(screen.queryByText('Best five cards')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Ace of spades')).not.toBeInTheDocument();
});
it('does not invent a result reason or rank for historical records', () => {
  render(<HandResultPanel result={{ ...showdownResult, presentation: undefined }} names={{ host: 'REI' }} />);
  expect(screen.getByText('Detailed cards unavailable')).toBeVisible();
  expect(screen.queryByText('Showdown')).not.toBeInTheDocument();
  expect(screen.queryByText('Won by fold')).not.toBeInTheDocument();
  expect(screen.getByText('Payout 1,552 chips (includes any returned chips)')).toBeVisible();
});

it('explains a board-playing split and preserves odd chips plus separate returns', () => {
  const board = [12, 11, 10, 9, 8];
  const detail = showdownResult.presentation!;
  const result = { ...showdownResult, winners: ['host', 'guest'], payouts: [{ accountId: 'host', amount: 777 }, { accountId: 'guest', amount: 775 }],
    presentation: { ...detail, board, rankings: detail.rankings.map((rank) => ({ ...rank, rank: { category: 8, tiebreak: [14] },
      handName: 'Straight flush, ace high', bestFive: board, combinationCards: board, kickers: [], playsBoard: true })),
      pots: [{ amount: 1551, eligibleAccountIds: ['host', 'guest'], winners: ['host', 'guest'], payouts: [{ accountId: 'host', amount: 776 }, { accountId: 'guest', amount: 775 }] }],
      uncalledReturns: [{ accountId: 'host', amount: 1 }] } };
  render(<HandResultPanel result={result} />);
  expect(screen.getByText(/Both players play the board/)).toBeVisible();
  expect(screen.getByText('Returned 1 chips')).toBeVisible();
  expect(screen.getByText('Awarded 776 chips')).toBeVisible();
  expect(screen.getByText('Awarded 775 chips')).toBeVisible();
});

it('keeps distinct side-pot winners and explains a decisive kicker from the server ranks', () => {
  const detail = showdownResult.presentation!;
  const result = { ...showdownResult, winners: ['host', 'guest'],
    presentation: { ...detail, rankings: detail.rankings.map((rank) => ({ ...rank, handName: 'Pair of aces',
      rank: { category: 1, tiebreak: rank.accountId === 'host' ? [14, 13, 8, 5] : [14, 12, 8, 5] }, kickers: rank.accountId === 'host' ? [13, 8, 5] : [12, 8, 5] })),
      pots: [{ amount: 1000, eligibleAccountIds: ['host', 'guest'], winners: ['host'], payouts: [{ accountId: 'host', amount: 1000 }] },
        { amount: 552, eligibleAccountIds: ['guest'], winners: ['guest'], payouts: [{ accountId: 'guest', amount: 552 }] }] } };
  render(<HandResultPanel result={result} />);
  expect(screen.getByText(/REI wins with king kicker/)).toBeVisible();
  expect(screen.getByText(/Side pot 1/)).toBeVisible();
  expect(screen.getAllByText('Winner')).toHaveLength(2);
});
