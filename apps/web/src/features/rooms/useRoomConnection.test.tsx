// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { roomStore } from './roomStore';
import { gameStore } from './gameStore';
import { createMutationCommand, useRoomConnection } from './useRoomConnection';

const harness = vi.hoisted(() => {
  const handlers = new Map<string, (payload: unknown) => void>();
  const acknowledgements: Array<(reply: unknown) => void> = [];
  const emitted: Array<{ event: string; command: unknown }> = [];
  const refresh = vi.fn();
  const socket = {
    connected: false,
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    connect: vi.fn(() => {
      socket.connected = true;
      handlers.get('connection:ready')?.({ authorityBootId: 'boot-a' });
      return socket;
    }),
    close: vi.fn(() => { socket.connected = false; }),
    emit: vi.fn((event: string, command: unknown, ack: (reply: unknown) => void) => {
      emitted.push({ event, command });
      acknowledgements.push(ack);
    }),
  };
  return { acknowledgements, emitted, handlers, socket, refresh };
});

vi.mock('../../lib/socket', () => ({ createGameSocket: () => harness.socket }));
vi.mock('../auth/SessionBoundary', () => ({
  useSession: () => ({
    session: { status: 'authenticated', account: { accountId: 'account-a', displayName: 'Alice' } },
    refresh: harness.refresh,
    signOut: vi.fn(),
  }),
}));

describe('useRoomConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    roomStore.getState().setAccount('account-a');
    roomStore.getState().clear();
    harness.acknowledgements.length = 0;
    harness.emitted.length = 0;
    harness.handlers.clear();
    harness.socket.connected = false;
    harness.refresh.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries an uncertain mutation with the exact same command identity', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const { result, unmount } = renderHook(() => useRoomConnection(null), { wrapper });
    const command = createMutationCommand('room:create', 'boot-a', { title: 'Friday table' });
    let firstReply: Awaited<ReturnType<typeof result.current.send>> | undefined;

    await act(async () => {
      const firstReplyPromise = result.current.send(command);
      vi.advanceTimersByTime(5_000);
      firstReply = await firstReplyPromise;
    });
    expect(firstReply).toMatchObject({ error: { code: 'COMMAND_UNCERTAIN' } });
    expect(result.current.canRetryPending).toBe(true);

    let retryPromise: ReturnType<typeof result.current.retryPending>;
    act(() => { retryPromise = result.current.retryPending(); });
    expect(harness.emitted[1]?.command).toBe(command);
    expect((harness.emitted[1]?.command as { commandId: string }).commandId).toBe(command.commandId);
    await act(async () => {
      harness.acknowledgements[1]?.({ data: { room: null }, error: null });
      await retryPromise!;
    });
    await expect(retryPromise!).resolves.toEqual({ data: { room: null }, error: null });
    expect(result.current.canRetryPending).toBe(false);

    unmount();
  });

  it('invalidates only this account wallet on reconnect and an account change hint', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['wallet', 'account-a'], { balance: 1 });
    queryClient.setQueryData(['wallet', 'account-b'], { balance: 9 });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(() => useRoomConnection(null), { wrapper });
    expect(queryClient.getQueryState(['wallet', 'account-a'])?.isInvalidated).toBe(true);
    queryClient.setQueryData(['wallet', 'account-a'], { balance: 2 });
    act(() => harness.handlers.get('account:changed')?.({ revision: 3 }));
    expect(queryClient.getQueryState(['wallet', 'account-a'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['wallet', 'account-b'])?.isInvalidated).toBe(false);
    view.unmount();
    queryClient.clear();
  });

  it('closes and refreshes authentication when the server disconnects a revoked socket', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(() => useRoomConnection(null), { wrapper });
    act(() => harness.handlers.get('disconnect')?.('io server disconnect'));
    expect(view.result.current.status).toBe('closed');
    expect(harness.refresh).toHaveBeenCalledOnce();
    view.unmount();
    queryClient.clear();
  });

  it('preserves the owning socket when navigating from the lobby into a room', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(({ roomId }: { roomId: string | null }) => useRoomConnection(roomId), { wrapper, initialProps: { roomId: null as string | null } });
    harness.socket.close.mockClear();
    harness.socket.connect.mockClear();
    view.rerender({ roomId: 'room-a' });
    expect(harness.socket.close).not.toHaveBeenCalled();
    expect(harness.socket.connect).not.toHaveBeenCalled();
    expect(harness.emitted.at(-1)).toMatchObject({ event: 'room:sync', command: { roomId: 'room-a' } });
    view.unmount();
    expect(harness.socket.close).toHaveBeenCalledOnce();
    queryClient.clear();
  });

  it('ignores a room synchronization acknowledgement after navigation changes', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(({ roomId }: { roomId: string | null }) => useRoomConnection(roomId), { wrapper, initialProps: { roomId: 'room-a' as string | null } });
    const staleAck = harness.acknowledgements[0]!;
    const apply = vi.spyOn(roomStore.getState(), 'applySnapshot');
    view.rerender({ roomId: 'room-b' });
    await act(async () => { staleAck({ data: { room: { roomId: 'room-a' } }, error: null }); });
    expect(apply).not.toHaveBeenCalled();
    view.unmount(); apply.mockRestore(); queryClient.clear();
  });

  it('keeps the last private display stale during transport loss with actions disabled', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(() => useRoomConnection('room-a'), { wrapper });
    const clear = vi.spyOn(gameStore.getState(), 'clear');
    clear.mockClear();
    act(() => harness.handlers.get('disconnect')?.('transport close'));
    expect(view.result.current.status).toBe('reconnecting');
    expect(clear).not.toHaveBeenCalled();
    view.unmount(); clear.mockRestore(); queryClient.clear();
  });

  it('does not mark a room connected before its reconnect synchronization completes', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(() => useRoomConnection('room-a'), { wrapper });
    expect(view.result.current.status).not.toBe('connected');
    await act(async () => { harness.acknowledgements[0]!({ data: { room: { roomId: 'room-a', phase: 'waiting', sessionId: null, members: [], control: { isController: true, epoch: 1 }, revision: 1, authorityBootId: 'boot-a' } }, error: null }); });
    expect(view.result.current.status).not.toBe('connected');
    await act(async () => { harness.acknowledgements[1]!({ data: { game: null, outcome: null }, error: null }); });
    expect(view.result.current.status).toBe('connected');
    act(() => harness.handlers.get('disconnect')?.('transport close'));
    act(() => harness.handlers.get('connection:ready')?.({ authorityBootId: 'boot-a' }));
    expect(view.result.current.status).not.toBe('connected');
    view.unmount(); queryClient.clear();
  });

  it('clears the old game boundary immediately on a room route change', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(({ roomId }) => useRoomConnection(roomId), { wrapper, initialProps: { roomId: 'room-a' as string | null } });
    gameStore.setState({ roomId: 'room-a', game: { roomId: 'room-a', sessionPhase: 'ended' } as NonNullable<ReturnType<typeof gameStore.getState>['game']> });
    view.rerender({ roomId: 'room-b' });
    expect(view.result.current.game).toBeNull();
    expect(gameStore.getState().game).toBeNull();
    view.unmount(); queryClient.clear();
  });

  it('accepts a session started by the host while a guest is synchronizing entry', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
    const view = renderHook(() => useRoomConnection('room-a'), { wrapper });
    const waiting = { roomId: 'room-a', phase: 'waiting', sessionId: null, members: [], control: { isController: true, epoch: 1 }, revision: 1, authorityBootId: 'boot-a' };
    await act(async () => { harness.acknowledgements[0]!({ data: { room: waiting }, error: null }); });
    act(() => harness.handlers.get('room:snapshot')?.({ ...waiting, phase: 'playing', sessionId: 'session-a', revision: 2 }));
    const game = { roomId: 'room-a', sessionId: 'session-a', authorityBootId: 'boot-a', snapshotRevision: 1 };
    await act(async () => { harness.acknowledgements[1]!({ data: { game, outcome: null }, error: null }); });
    expect(view.result.current.status).toBe('connected');
    expect(view.result.current.game).toEqual(game);
    view.unmount(); queryClient.clear();
  });
});
