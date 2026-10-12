// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import type { GameView, RoomView } from '@poker/contracts';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PokerTable, type PokerTableProps } from './PokerTable';

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
  it('keeps the caller marker separate from a long player name', () => {
    render(<PokerTable {...props} game={{ ...game, participants: game.participants.map((player) => player.accountId === 'host' ? { ...player, displayName: 'Alexandria Through the Looking Glass' } : player) }} />);
    expect(screen.getByText('(you)', { exact: true })).toBeVisible();
    expect(screen.getByText('Alexandria Through the Looking Glass')).toBeVisible();
  });
  it('keeps caller and opponent seat positions stable after disconnect or fold', () => {
    const view = render(<PokerTable {...props} />);
    const own = screen.getByText('Host', { exact: true }).closest('li')!;
    const opponent = screen.getByText('Guest').closest('li')!;
    expect(own).toHaveAttribute('data-position', 'bottom');
    expect(opponent).toHaveAttribute('data-position', 'top');
    view.rerender(<PokerTable {...props} game={{ ...game, participants: game.participants.map((player) => ({ ...player, folded: true, connected: false })) }} />);
    expect(screen.getByText('Host', { exact: true }).closest('li')).toHaveAttribute('data-position', 'bottom');
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
    expect(screen.getByRole('button', { name: 'Raise 39' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise 40' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'raise', raiseTo: 40 });
  });

  it('disables actions for an observer tab and never shows opponent cards', () => {
    render(<PokerTable {...props} room={{ ...room, control: { isController: false, epoch: 1 } }}
      game={{ ...game, control: { isController: false, epoch: 1 },
      legalActions: { canFold: false, canCheck: false, callAmount: 0, raise: null } }} />);
    expect(screen.queryByRole('button', { name: 'Call 10' })).not.toBeInTheDocument();
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
