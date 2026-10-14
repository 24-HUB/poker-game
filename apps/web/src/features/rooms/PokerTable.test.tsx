// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import type { GameView, RoomView } from '@poker/contracts';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PokerTable, type PokerTableProps } from './PokerTable';
import { showdownResult } from './handResultFixtures.test-support';

const room: RoomView = {
  roomId: 'room-a', title: 'Friday table', revision: 3, hostAccountId: 'host', phase: 'playing',
  sessionId: 'session-a', members: [], control: { isController: true, epoch: 1 },
};
const game: GameView = {
  roomId: 'room-a', authorityBootId: 'boot-a', sessionId: 'session-a', handId: 'hand-a',
  snapshotRevision: 1, gameVersion: 0, sessionPhase: 'playing', handPhase: 'preflop',
  handNumber: 1, smallBlind: 10, bigBlind: 20, smallBlindSeat: 0, bigBlindSeat: 1, currentBet: 20,
  participants: [{ accountId: 'host', displayName: 'Host', seat: 0, stack: 990,
    streetContribution: 10, totalContribution: 10, folded: false, allIn: false, connected: true },
  { accountId: 'guest', displayName: 'Guest', seat: 1, stack: 980,
    streetContribution: 20, totalContribution: 20, folded: false, allIn: false, connected: true }],
  board: [], pots: [{ amount: 30, eligibleAccountIds: ['host', 'guest'] }], buttonSeat: 0,
  actorAccountId: 'host', serverTime: new Date().toISOString(), deadline: null,
  holeCards: [0, 13], revealedCards: [], legalActions: { canFold: true, canCheck: false,
    callAmount: 10, raise: { minRaiseTo: 40, maxRaiseTo: 1000, amountStep: 1, shortAllInOnly: false } },
  control: { isController: true, epoch: 1 }, handResult: null, sessionResult: null,
};
const props: PokerTableProps = { room, game, accountId: 'host', status: 'connected', pending: false,
  message: null, onAction: vi.fn(), onEnd: vi.fn(), onStart: vi.fn(), onLeave: vi.fn(),
  onClaimControl: vi.fn(), onRetryPending: vi.fn() };

describe('PokerTable', () => {
  afterEach(cleanup);
  it('reveals only committed showdown seats and clears winners and ranks on a newer hand', () => {
    const resultGame = { ...game, actorAccountId: null, handPhase: 'result' as const, handNumber: 5,
      handResult: showdownResult, board: showdownResult.presentation!.board };
    const view = render(<PokerTable {...props} game={resultGame} />);
    const guest = screen.getByLabelText('Player: Guest').closest('li')!;
    expect(guest).toHaveTextContent('K♠');
    expect(screen.getAllByText('Winner')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Fold' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss hand result' })).not.toBeInTheDocument();
    view.rerender(<PokerTable {...props} game={{ ...game, handId: 'next', handNumber: 6, handResult: showdownResult }} />);
    expect(screen.queryByRole('heading', { name: 'Hand 5 result' })).not.toBeInTheDocument();
    expect(screen.queryByText('Winner')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hidden cards')).not.toHaveTextContent('K♠');
  });
  it('preserves a confirmed showdown while the next transition is paused', () => {
    render(<PokerTable {...props} game={{ ...game, handNumber: 5, handPhase: 'paused', actorAccountId: null, handResult: showdownResult }} />);
    expect(screen.getByRole('heading', { name: 'Hand 5 result' })).toBeVisible();
    expect(screen.getByLabelText('Player: Guest').closest('li')).toHaveTextContent('K♠');
    expect(screen.getByText('Result confirmation paused')).toBeVisible();
  });
  it('moves focus to the table heading only when a focused betting control is removed', () => {
    const view = render(<PokerTable {...props} />);
    screen.getByRole('button', { name: 'Fold' }).focus();
    view.rerender(<PokerTable {...props} game={{ ...game, handPhase: 'result', actorAccountId: null, handNumber: 5, handResult: showdownResult }} />);
    expect(screen.getByRole('heading', { name: 'Friday table' })).toHaveFocus();
  });
  it('keeps focus on a surviving control when a new hand arrives', () => {
    const view = render(<PokerTable {...props} game={{ ...game, handNumber: 5, handPhase: 'result', handResult: showdownResult }} />);
    screen.getByRole('button', { name: 'Lobby' }).focus();
    view.rerender(<PokerTable {...props} game={{ ...game, handId: 'next', handNumber: 6 }} />);
    expect(screen.getByRole('button', { name: 'Lobby' })).toHaveFocus();
  });
  it('marks the acting portrait urgent in the final five seconds with a visible acting label', () => {
    const now = Date.now();
    render(<PokerTable {...props} game={{ ...game, serverTime: new Date(now).toISOString(), deadline: new Date(now + 4000).toISOString() }} />);
    expect(screen.getByRole('img', { name: /Host's default avatar/ }).parentElement).toHaveClass('poker-seat__portrait--acting', 'poker-seat__portrait--urgent');
    expect(screen.getByText('Acting · 4s')).toBeVisible();
  });
  it('shows default player portraits and empty community slots instead of hidden board cards', () => {
    render(<PokerTable {...props} />);
    expect(screen.getByRole('img', { name: /Host's default avatar/ })).toBeVisible();
    expect(screen.getAllByLabelText('Empty community card slot')).toHaveLength(5);
    expect(screen.queryByLabelText('Undealt card')).not.toBeInTheDocument();
  });
  it('does not announce an earlier hand winner during the next hand', () => {
    render(<PokerTable {...props} game={{ ...game, handResult: { handId: 'previous', handNumber: 1, winners: ['guest'] } as NonNullable<GameView['handResult']> }} />);
    expect(screen.queryByText(/Winner:/)).not.toBeInTheDocument();
  });
  it('retains the final numbered result when the ended session clears its live hand ID', () => {
    render(<PokerTable {...props} game={{ ...game, sessionPhase: 'ended', handId: null, handPhase: null, handResult: { ...showdownResult, presentation: undefined, handNumber: 1, winners: ['guest'], revealedCards: [{ accountId: 'guest', cards: [0, 13] }] } }} />);
    expect(screen.getByRole('heading', { name: 'Hand 1 result' })).toBeVisible();
    expect(screen.getByText('Winner: Guest')).toBeVisible();
    expect(screen.getByText('Detailed cards unavailable')).toBeVisible();
    expect(screen.getByLabelText('Player: Guest').closest('li')).toHaveTextContent('2♣');
  });
  it('offers four-colour suits without changing the ranks or exposing hidden cards', () => {
    render(<PokerTable {...props} />);
    fireEvent.click(screen.getByText('Room options', { exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Four-colour suits' }));
    expect(screen.getByRole('region', { name: 'Poker table' })).toHaveClass('poker-table--four-colour');
    expect(screen.getByLabelText('Your cards')).toHaveTextContent('2♣2♦');
    expect(screen.getByLabelText('Hidden cards')).not.toHaveTextContent('2♣');
  });
  it('keeps the caller marker separate from a long player name', () => {
    render(<PokerTable {...props} game={{ ...game, participants: game.participants.map((player) => player.accountId === 'host' ? { ...player, displayName: 'Alexandria Through the Looking Glass' } : player) }} />);
    expect(screen.getByText('(you)', { exact: true })).toBeVisible();
    expect(screen.getByLabelText('Player: Alexandria Through the Looking Glass')).toBeVisible();
  });
  it('keeps caller and opponent seat positions stable after disconnect or fold', () => {
    const view = render(<PokerTable {...props} />);
    const own = screen.getByLabelText('Player: Host').closest('li')!;
    const opponent = screen.getByLabelText('Player: Guest').closest('li')!;
    expect(own).toHaveAttribute('data-position', 'bottom');
    expect(opponent).toHaveAttribute('data-position', 'top');
    view.rerender(<PokerTable {...props} game={{ ...game, participants: game.participants.map((player) => ({ ...player, folded: true, connected: false })) }} />);
    expect(screen.getByLabelText('Player: Host').closest('li')).toHaveAttribute('data-position', 'bottom');
  });
  it('prevents an observer from starting a finished session and explains takeover', () => {
    render(<PokerTable {...props} room={{ ...room, phase: 'waiting', members: [
      { accountId: 'host', displayName: 'Host', seat: 0, connected: true },
      { accountId: 'guest', displayName: 'Guest', seat: 1, connected: true },
    ], control: { isController: false, epoch: 2 } }} game={{ ...game, sessionPhase: 'ended', control: { isController: false, epoch: 2 } }} />);
    expect(screen.getByRole('button', { name: 'Start new session' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use this tab to play' })).toBeVisible();
  });
  it('distinguishes the main pot and side pots after unequal all-ins', () => {
    render(<PokerTable {...props} game={{ ...game, handPhase: 'result', pots: [
      { amount: 1800, eligibleAccountIds: ['host', 'guest'] },
      { amount: 200, eligibleAccountIds: ['guest'] },
    ] }} />);
    expect(screen.getByText('Main pot: 1800 chips · Side pot 1: 200 chips')).toBeVisible();
  });
  it('shows the live total before contribution levels become settled pots', () => {
    render(<PokerTable {...props} game={{ ...game, pots: [
      { amount: 20, eligibleAccountIds: ['host', 'guest'] },
      { amount: 10, eligibleAccountIds: ['guest'] },
    ] }} />);
    expect(screen.getByText('Pot: 30 chips')).toBeVisible();
    expect(screen.queryByText(/Side pot/)).not.toBeInTheDocument();
  });
  it('renders server legal actions and enforces raise bounds', () => {
    const onAction = vi.fn();
    const view = render(<PokerTable {...props} onAction={onAction} />);
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Call 10' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'call' });
    view.rerender(<PokerTable {...props} onAction={onAction} game={{ ...game, gameVersion: 1 }} />);
    const input = screen.getByRole('spinbutton', { name: /raise to/i });
    fireEvent.change(input, { target: { value: '39' } });
    expect(screen.getByRole('button', { name: 'Raise to 39' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise to 40' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'raise', raiseTo: 40 });
  });

  it('disables actions for an observer tab and never shows opponent cards', () => {
    render(<PokerTable {...props} room={{ ...room, control: { isController: false, epoch: 1 } }}
      game={{ ...game, control: { isController: false, epoch: 1 },
      legalActions: { canFold: false, canCheck: false, callAmount: 0, raise: null } }} />);
    expect(screen.getByRole('button', { name: 'Call 10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use this tab to play' })).toBeVisible();
    expect(screen.getByLabelText('Your cards')).toHaveTextContent('2♣');
    expect(screen.getByLabelText('Hidden cards')).not.toHaveTextContent('2♣');
  });

  it('allows the current actor to finish a hand after the host requests session end', () => {
    render(<PokerTable {...props} game={{ ...game, sessionPhase: 'ending' }} />);
    expect(screen.getByRole('button', { name: 'Fold' })).toBeEnabled();
  });

  it('uses cosmetic backs only for hidden cards and preserves readable private fronts', () => {
    const avatar = { id: 'avatar', name: 'Star Scout', slot: 'avatar' as const, rarity: 'R' as const, assetUrl: '/art/cosmetics/star-scout-avatar.svg' };
    const back = { id: 'back', name: 'Star Scout Card Back', slot: 'cardBack' as const, rarity: 'R' as const, assetUrl: '/art/cosmetics/star-scout-back.svg' };
    render(<PokerTable {...props} game={{ ...game, participants: game.participants.map((player) => ({ ...player, equipment: { avatar, cardBack: back } })) }} />);
    expect(screen.getByLabelText('Your cards')).toHaveTextContent('2♣');
    expect(screen.getByLabelText('Your cards').querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByLabelText('Hidden cards').querySelectorAll('img')).toHaveLength(2);
    expect(screen.getByLabelText('Hidden cards')).not.toHaveTextContent('2♣');
    expect(screen.getByRole('img', { name: "Guest's Star Scout avatar" })).toBeVisible();
  });
});
