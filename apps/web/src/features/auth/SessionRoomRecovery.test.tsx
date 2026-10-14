// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { GameView, RoomView } from '@poker/contracts';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { SessionBoundary, SessionProvider, useSession } from './SessionBoundary';
import { RoomConnectionProvider, useSharedRoomConnection } from '../rooms/RoomConnectionProvider';
import { roomStore } from '../rooms/roomStore';
import { gameStore } from '../rooms/gameStore';
import { createMutationCommand } from '../rooms/useRoomConnection';
import type { SessionState } from '../../lib/auth-client';

const socket = vi.hoisted(() => ({ connected: true, on: vi.fn(), connect: vi.fn(), close: vi.fn(), emit: vi.fn() }));
vi.mock('../../lib/socket', () => ({ createGameSocket: () => socket }));
vi.mock('next/navigation', () => ({ usePathname: () => '/rooms/room-a' }));
afterEach(() => { cleanup(); roomStore.getState().setAccount(null); gameStore.getState().clear(); vi.clearAllMocks(); });

const room: RoomView = { roomId: 'room-a', title: 'Friday', revision: 1, hostAccountId: 'a', phase: 'playing', sessionId: 'session-a', members: [], control: { isController: true, epoch: 1 } };
const game: GameView = {
  roomId: 'room-a', authorityBootId: 'boot-a', sessionId: 'session-a', handId: 'hand-a', snapshotRevision: 1,
  gameVersion: 1, sessionPhase: 'playing', handPhase: 'preflop', participants: [],
  handNumber: 1, smallBlind: 10, bigBlind: 20, smallBlindSeat: 0, bigBlindSeat: 1, currentBet: 20,
  board: [], pots: [], buttonSeat: 0, actorAccountId: 'a', serverTime: new Date().toISOString(),
  deadline: null, holeCards: [0, 1], revealedCards: [], legalActions: { canFold: true, canCheck: false, callAmount: 10, raise: null },
  control: { isController: true, epoch: 1 }, handResult: null, sessionResult: null,
};

it('preserves the owning room, game and pending command through unverified recovery and clears them on logout', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const identity: SessionState = { status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } };
  const reader = vi.fn().mockResolvedValueOnce(identity).mockResolvedValueOnce({ status: 'unavailable', reason: 'retryable' }).mockResolvedValueOnce(identity).mockResolvedValueOnce({ status: 'unauthenticated' });
  let refresh!: () => Promise<void>;
  let connection!: ReturnType<typeof useSharedRoomConnection>;
  function Probe() { refresh = useSession().refresh; connection = useSharedRoomConnection(); return <SessionBoundary><p>Private table</p></SessionBoundary>; }
  render(<QueryClientProvider client={client}><SessionProvider sessionReader={reader}><RoomConnectionProvider><Probe /></RoomConnectionProvider></SessionProvider></QueryClientProvider>);
  await screen.findByText('Private table');
  await waitFor(() => expect(socket.connect).toHaveBeenCalled());
  const pending = createMutationCommand('room:leave', 'boot-a', { roomId: 'room-a', controlEpoch: 1 });
  act(() => {
    roomStore.getState().applySnapshot(room); roomStore.getState().setPendingCommand(pending);
    gameStore.getState().setBoundary('a', 'room-a', 'session-a', 'boot-a'); gameStore.getState().applySnapshot(game);
  });
  socket.close.mockClear(); socket.emit.mockClear();
  await act(async () => { await refresh(); });
  expect(screen.queryByText('Private table')).not.toBeInTheDocument();
  expect(roomStore.getState().room).toEqual(room);
  expect(roomStore.getState().pendingCommand).toEqual(pending);
  expect(gameStore.getState().game).toEqual(game);
  expect(socket.close).not.toHaveBeenCalled();
  await expect(connection.send(pending)).resolves.toMatchObject({ error: { code: 'SERVICE_UNAVAILABLE' } });
  expect(socket.emit).not.toHaveBeenCalled();
  await act(async () => { await refresh(); });
  expect(await screen.findByText('Private table')).toBeVisible();
  expect(gameStore.getState().game).toEqual(game);
  await act(async () => { await refresh(); });
  expect(roomStore.getState().room).toBeNull(); expect(gameStore.getState().game).toBeNull();
  expect(socket.close).toHaveBeenCalledOnce();
  client.clear();
});
