// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAccountSync } from './useAccountSync';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), sockets: [] as { handlers: Map<string, (...args: unknown[]) => void>; close: ReturnType<typeof vi.fn> }[] }));
vi.mock('../auth/SessionBoundary', () => ({ useSession: () => ({ refresh: mocks.refresh }) }));
vi.mock('../../lib/socket', () => ({ createGameSocket: () => {
  const socket = { handlers: new Map<string, (...args: unknown[]) => void>(), close: vi.fn(), connect: vi.fn(),
    on(event: string, handler: (...args: unknown[]) => void) { this.handlers.set(event, handler); } };
  mocks.sockets.push(socket); return socket;
} }));
afterEach(() => { mocks.sockets.length = 0; vi.clearAllMocks(); });

it('recovers durable collection and equipment on reconnect after a missed change hint', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  let saved = { itemId: null as string | null, revision: 0 };
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const view = renderHook(() => {
    useAccountSync('alice');
    return useQuery({ queryKey: ['collection', 'alice'], queryFn: async () => ({ equipment: saved }) });
  }, { wrapper });
  await waitFor(() => expect(view.result.current.data?.equipment.revision).toBe(0));
  client.setQueryData(['equipment', 'alice'], saved);
  client.setQueryData(['equipment', 'bob'], { itemId: 'bob-avatar', revision: 4 });
  saved = { itemId: 'moon-courier-avatar', revision: 1 };
  // No account:changed hint arrived while disconnected. Ready must restore durable state.
  act(() => mocks.sockets[0]!.handlers.get('connection:ready')!());
  await waitFor(() => expect(view.result.current.data?.equipment).toEqual(saved));
  expect(client.getQueryState(['equipment', 'alice'])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['equipment', 'bob'])?.isInvalidated).toBe(false);
  act(() => mocks.sockets[0]!.handlers.get('disconnect')!('transport close'));
  expect(mocks.refresh).not.toHaveBeenCalled();
  act(() => mocks.sockets[0]!.handlers.get('disconnect')!('io server disconnect'));
  expect(mocks.refresh).toHaveBeenCalledOnce();
  view.unmount(); expect(mocks.sockets[0]!.close).toHaveBeenCalledOnce(); client.clear();
});
