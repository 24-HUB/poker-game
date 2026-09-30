// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { roomStore } from './roomStore';
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
});
