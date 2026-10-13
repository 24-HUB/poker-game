// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameView } from '@poker/contracts';
import { PokerActionPanel } from './PokerActionPanel';

const game: GameView = {
  roomId: 'room', sessionId: 'session', handId: 'hand', authorityBootId: 'boot', handNumber: 2,
  gameVersion: 1, snapshotRevision: 1, smallBlind: 10, bigBlind: 20, smallBlindSeat: 0, bigBlindSeat: 1, currentBet: 20,
  sessionPhase: 'playing', handPhase: 'preflop', participants: [{ accountId: 'a', displayName: 'Alice', seat: 0, stack: 990, streetContribution: 10, totalContribution: 10, folded: false, allIn: false, connected: true },
    { accountId: 'b', displayName: 'Bob', seat: 1, stack: 980, streetContribution: 20, totalContribution: 20, folded: false, allIn: false, connected: true }],
  board: [], pots: [], buttonSeat: 0, actorAccountId: 'a', serverTime: new Date().toISOString(), deadline: null, holeCards: [0, 1], revealedCards: [],
  legalActions: { canFold: true, canCheck: false, callAmount: 10, raise: { minRaiseTo: 40, maxRaiseTo: 1000, amountStep: 1, shortAllInOnly: false } },
  control: { isController: true, epoch: 1 }, handResult: null, sessionResult: null,
};
const props = { game, accountId: 'a', status: 'connected' as const, pending: false, message: null, onAction: vi.fn(), onRetryPending: vi.fn() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('PokerActionPanel', () => {
  it('labels opening bets and resets an invalid draft on a new street and turn', () => {
    const view = render(<PokerActionPanel {...props} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
    const flop: GameView = { ...game, handPhase: 'flop', currentBet: 0, legalActions: { ...game.legalActions, canCheck: true, callAmount: 0, raise: { ...game.legalActions.raise!, minRaiseTo: 20 } } };
    view.rerender(<PokerActionPanel {...props} game={flop} />);
    expect(screen.getByRole('spinbutton', { name: 'Bet amount' })).toHaveValue(20);
    expect(screen.getByRole('button', { name: 'Bet 20' })).toBeEnabled();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
    view.rerender(<PokerActionPanel {...props} game={{ ...flop, actorAccountId: 'b' }} />);
    view.rerender(<PokerActionPanel {...props} game={{ ...flop, gameVersion: 3 }} />);
    expect(screen.getByRole('spinbutton', { name: 'Bet amount' })).toHaveValue(20);
  });
  it('keeps three disabled action positions while hiding the amount editor off turn', () => {
    render(<PokerActionPanel {...props} game={{ ...game, actorAccountId: 'b', legalActions: { canFold: false, canCheck: false, callAmount: 0, raise: null } }} />);
    expect(screen.getByRole('button', { name: 'Fold' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Call 10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Raise' })).toBeDisabled();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
  it('sizes pot presets after calling and clamps them to server-authorized bounds', () => {
    render(<PokerActionPanel {...props} game={{ ...game, pots: [{ amount: 100, eligibleAccountIds: ['a', 'b'] }] }} />);
    fireEvent.click(screen.getByRole('button', { name: '½ pot' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(75);
    fireEvent.click(screen.getByRole('button', { name: 'Pot' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(130);
    fireEvent.click(screen.getByRole('button', { name: 'All-in' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(1000);
    expect(props.onAction).not.toHaveBeenCalled();
  });
  it('names the turn once during play while retaining actor context for an observer', () => {
    const view = render(<PokerActionPanel {...props} />);
    expect(screen.getByText('Your turn')).toBeVisible();
    expect(screen.queryByText('Turn: Alice')).not.toBeInTheDocument();
    view.rerender(<PokerActionPanel {...props} game={{ ...game, actorAccountId: 'b' }} />);
    expect(screen.getByText('Bob is acting')).toBeVisible();
    expect(screen.queryByText('Turn: Bob')).not.toBeInTheDocument();
    view.rerender(<PokerActionPanel {...props} game={{ ...game, actorAccountId: 'b', control: { isController: false, epoch: 2 } }} />);
    expect(screen.getByText('Turn: Bob')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fold' })).toBeDisabled();
  });
  it('blocks betting for an aborted session even if an old snapshot retains legal actions', () => {
    render(<PokerActionPanel {...props} game={{ ...game, sessionPhase: 'aborted' }} />);
    expect(screen.getByRole('button', { name: 'Fold' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Raise to 40' })).toBeDisabled();
    expect(screen.getByText(/Session interrupted/)).toBeVisible();
  });
  it('edits using input, slider and presets without submitting; preserves ordinary edits', () => {
    const view = render(<PokerActionPanel {...props} />);
    expect(screen.getByText('Your turn')).toBeVisible();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise to' }), { target: { value: '125' } });
    expect(screen.getByRole('slider', { name: 'Raise amount' })).toHaveValue('125');
    view.rerender(<PokerActionPanel {...props} game={{ ...game, snapshotRevision: 2, serverTime: new Date().toISOString() }} />);
    expect(screen.getByRole('spinbutton', { name: 'Raise to' })).toHaveValue(125);
    fireEvent.change(screen.getByRole('slider', { name: 'Raise amount' }), { target: { value: '200' } });
    expect(screen.getByRole('spinbutton', { name: 'Raise to' })).toHaveValue(200);
    fireEvent.click(screen.getByRole('button', { name: 'Maximum' }));
    expect(props.onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Raise to 1000' }));
    fireEvent.click(screen.getByRole('button', { name: 'Raise to 1000' }));
    expect(props.onAction).toHaveBeenCalledExactlyOnceWith({ type: 'raise', raiseTo: 1000 });
  });
  it.each(['', '39', '1001', '40.5'])('rejects invalid amount %s with inline feedback', (value) => {
    render(<PokerActionPanel {...props} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise to' }), { target: { value } });
    expect(screen.getByRole('button', { name: /^Raise to \d|^Raise$/ })).toBeDisabled();
    expect(screen.getByText(/Enter a whole-chip amount/)).toBeVisible();
  });
  it('revalidates limits without silently replacing the selection and enforces short all-in', () => {
    const view = render(<PokerActionPanel {...props} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise to' }), { target: { value: '200' } });
    view.rerender(<PokerActionPanel {...props} game={{ ...game, legalActions: { ...game.legalActions, raise: { minRaiseTo: 55, maxRaiseTo: 55, amountStep: 1, shortAllInOnly: true } } }} />);
    expect(screen.getByRole('spinbutton', { name: 'Raise to' })).toHaveValue(200);
    expect(screen.getByRole('button', { name: 'Raise to 200' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Minimum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Raise to 55' }));
    expect(props.onAction).toHaveBeenCalledWith({ type: 'raise', raiseTo: 55 });
  });
  it('shows opponent and transport explanations and derives Bet/Check from legal state', () => {
    const view = render(<PokerActionPanel {...props} game={{ ...game, currentBet: 0, legalActions: { ...game.legalActions, canCheck: true, callAmount: 0 } }} />);
    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Bet 40' })).toBeEnabled();
    view.rerender(<PokerActionPanel {...props} game={{ ...game, actorAccountId: 'b' }} />);
    expect(screen.getByText('Bob is acting')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fold' })).toBeDisabled();
    view.rerender(<PokerActionPanel {...props} status="reconnecting" />);
    expect(screen.getByText(/Reconnecting.*actions are unavailable/)).toBeVisible();
  });
});
