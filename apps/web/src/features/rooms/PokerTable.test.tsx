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
  participants: [{ accountId: 'host', displayName: 'Host', seat: 0, stack: 990,
    streetContribution: 10, totalContribution: 10, folded: false, allIn: false, connected: true },
  { accountId: 'guest', displayName: 'Guest', seat: 1, stack: 980,
    streetContribution: 20, totalContribution: 20, folded: false, allIn: false, connected: true }],
  board: [], pots: [{ amount: 30, eligibleAccountIds: ['host', 'guest'] }], buttonSeat: 0,
  actorAccountId: 'host', serverTime: new Date().toISOString(), deadline: null,
  holeCards: [0, 13], revealedCards: [], legalActions: { canFold: true, canCheck: false,
    callAmount: 10, raise: { minRaiseTo: 40, maxRaiseTo: 1000, shortAllInOnly: false } },
  control: { isController: true, epoch: 1 }, handResult: null, sessionResult: null,
};
const props: PokerTableProps = { room, game, accountId: 'host', status: 'connected', pending: false,
  message: null, onAction: vi.fn(), onEnd: vi.fn(), onStart: vi.fn(), onLeave: vi.fn(),
  onClaimControl: vi.fn(), onRetryPending: vi.fn() };

describe('PokerTable', () => {
  afterEach(cleanup);
  it('renders server legal actions and enforces raise bounds', () => {
    const onAction = vi.fn();
    render(<PokerTable {...props} onAction={onAction} />);
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Call 10' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'call' });
    const input = screen.getByRole('spinbutton', { name: /raise to/i });
    fireEvent.change(input, { target: { value: '39' } });
    expect(screen.getByRole('button', { name: 'Raise' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'raise', raiseTo: 40 });
  });

  it('disables actions for an observer tab and never shows opponent cards', () => {
    render(<PokerTable {...props} room={{ ...room, control: { isController: false, epoch: 1 } }}
      game={{ ...game, control: { isController: false, epoch: 1 },
      legalActions: { canFold: false, canCheck: false, callAmount: 0, raise: null } }} />);
    expect(screen.queryByRole('button', { name: 'Call 10' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim control' })).toBeVisible();
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
