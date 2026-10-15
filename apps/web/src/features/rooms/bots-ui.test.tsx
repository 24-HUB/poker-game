// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { GameView } from '@poker/contracts';
import { RoomLobby } from './RoomLobby';
import { HandCompletionBar } from './HandCompletionBar';
import { HandResultPanel } from './HandResultPanel';
import { showdownResult } from './handResultFixtures.test-support';

afterEach(cleanup);
const botId = 'bot:22222222-2222-4222-8222-222222222222';
const props = () => ({ accountId: 'host', room: { roomId: 'room', title: 'Practice', revision: 1,
  hostAccountId: 'host', phase: 'waiting' as const, sessionId: null,
  members: [{ accountId: 'host', displayName: 'Host', seat: 0, connected: true }],
  bots: [{ botId, displayName: 'Bot 1', seat: 1 }], control: { isController: true, epoch: 1 } },
  status: 'connected' as const, pending: false, invitationCode: null, message: null, canRetryPending: false,
  onTakeSeat: vi.fn(), onRotateInvitation: vi.fn(), onClaimControl: vi.fn(), onLeave: vi.fn(), onStart: vi.fn(),
  onRetryPending: vi.fn(), onAddBot: vi.fn(), onRemoveBot: vi.fn(),
});

it('lets a host start solo practice, add/remove bots, and explains ticket eligibility before starting', () => {
  const input = props(); render(<RoomLobby {...input} />);
  expect(screen.getByRole('button', { name: 'Start poker session' })).toBeEnabled();
  expect(screen.getByText('Practice · No tickets')).toBeVisible();
  expect(screen.getByText('Remove all bots before starting to earn tickets.')).toBeVisible();
  expect(screen.queryByText(/Reconnecting/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add bot to seat 3' }));
  expect(input.onAddBot).toHaveBeenCalledWith(2);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Bot 1' }));
  expect(input.onRemoveBot).toHaveBeenCalledWith(botId);
  expect(screen.queryByRole('button', { name: 'Take seat 2' })).not.toBeInTheDocument();
});
it('disables bot mutations in observer and pending tabs and hides them from non-hosts', () => {
  const input = props(); const view = render(<RoomLobby {...input} room={{ ...input.room, control: { isController: false, epoch: 1 } }} />);
  expect(screen.getByRole('button', { name: 'Remove Bot 1' })).toBeDisabled();
  view.rerender(<RoomLobby {...input} pending />);
  expect(screen.getByRole('button', { name: 'Add bot to seat 3' })).toBeDisabled();
  view.rerender(<RoomLobby {...input} accountId="guest" />);
  expect(screen.queryByRole('button', { name: 'Remove Bot 1' })).not.toBeInTheDocument();
});
it('explains practice results without a missing reward receipt and labels bot history participants', () => {
  const result = { ...showdownResult, mode: 'practice' as const, presentation: { ...showdownResult.presentation!,
    participants: showdownResult.presentation!.participants.map((player) => ({ ...player, kind: player.accountId === 'guest' ? 'bot' as const : 'human' as const })) } };
  const game = { mode: 'practice', sessionId: result.sessionId, handId: result.handId, handNumber: result.handNumber,
    handResult: result, handPhase: 'result', sessionPhase: 'playing', serverTime: new Date().toISOString() } as GameView;
  render(<><HandCompletionBar game={game} accountId="host" status="connected" pending={false} canStart={false} onStart={vi.fn()} />
    <HandResultPanel result={result} history /></>);
  expect(screen.getByText('Practice hand · No tickets earned.')).toBeVisible();
  expect(screen.queryByText(/reward.*unavailable|receipt|daily cap/i)).not.toBeInTheDocument();
  expect(screen.getByText('WC (Bot)')).toBeVisible();
});
