// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '../auth/SessionBoundary';
import { roomStore } from './roomStore';
import { ActiveRoomBoundary } from './ActiveRoomBoundary';
import type { SessionState } from '../../lib/auth-client';
import type { CurrentRoom, Result } from '@poker/contracts';

const navigation = vi.hoisted(() => ({ pathname: '/collection', replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ replace: navigation.replace }) }));
afterEach(() => { cleanup(); roomStore.getState().setAccount(null); vi.clearAllMocks(); navigation.pathname = '/collection'; });

function mount(reader: () => Promise<Result<CurrentRoom | null>>, initialSession: SessionState = { status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } }, sessionReader?: () => Promise<SessionState>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['session'], initialSession);
  render(createElement(QueryClientProvider, { client }, createElement(SessionProvider, {
    sessionReader: sessionReader ?? (async () => client.getQueryData(['session']) as SessionState),
    children: createElement(ActiveRoomBoundary, { reader, children: createElement('p', null, 'Destination content') }),
  })));
  return client;
}

describe('ActiveRoomBoundary', () => {
  it('does not expose an interactive destination while initial authentication is still loading', async () => {
    const reader = vi.fn(async () => ({ data: null, error: null } as Result<CurrentRoom | null>));
    let finishSession!: (session: SessionState) => void;
    mount(reader, { status: 'loading' }, () => new Promise((resolve) => { finishSession = resolve; }));
    expect(screen.queryByText('Destination content')).not.toBeInTheDocument();
    expect(reader).not.toHaveBeenCalled();
    await act(async () => { finishSession({ status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } }); });
    expect(await screen.findByText('Destination content')).toBeVisible();
    expect(reader).toHaveBeenCalled();
  });
  it('recovers a playing room from a direct route and hides destination content', async () => {
    mount(async () => ({ data: { roomId: 'own-room', title: 'Friday', phase: 'playing' }, error: null }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/rooms/own-room'));
    expect(screen.queryByText('Destination content')).not.toBeInTheDocument();
  });
  it('allows waiting rooms and account recovery routes', async () => {
    mount(async () => ({ data: { roomId: 'own-room', title: 'Friday', phase: 'waiting' }, error: null }));
    expect(await screen.findByText('Destination content')).toBeVisible();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
  it('recovers when a cached waiting room starts while its player is on another page', async () => {
    let playing = false;
    const client = mount(async () => ({ data: { roomId: 'own-room', title: 'Friday', phase: playing ? 'playing' : 'waiting' }, error: null }));
    await screen.findByText('Destination content');
    await act(async () => {
      roomStore.setState({ accountId: 'a', room: { roomId: 'own-room', title: 'Friday', phase: 'waiting' } as NonNullable<ReturnType<typeof roomStore.getState>['room']> });
      playing = true;
      await client.invalidateQueries({ queryKey: ['current-room', 'a'] });
    });
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/rooms/own-room'));
    expect(screen.queryByText('Destination content')).not.toBeInTheDocument();
  });
  it('ignores a stale request after the authenticated account changes', async () => {
    let resolve!: (result: Result<CurrentRoom | null>) => void;
    const client = mount(() => new Promise((done) => { resolve = done; }));
    await waitFor(() => expect(resolve).toBeTypeOf('function'));
    await act(async () => {
      client.setQueryData(['session'], { status: 'unauthenticated' });
      resolve({ data: { roomId: 'alice-room', title: 'Alice', phase: 'playing' }, error: null });
    });
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(await screen.findByText('Destination content')).toBeVisible();
  });
  it('keeps unavailable reads recoverable without logout or redirects', async () => {
    mount(async () => ({ data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'offline' } }));
    expect(await screen.findByRole('button', { name: 'Retry room connection' })).toBeVisible();
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Destination content')).not.toBeInTheDocument();
  });
  it('retains an uncertain leave command when membership disappears before its acknowledgement', async () => {
    navigation.pathname = '/rooms/own-room';
    let disappeared = false;
    const client = mount(async () => ({ data: disappeared ? null : { roomId: 'own-room', title: 'Friday', phase: 'playing' }, error: null }));
    await screen.findByText('Destination content');
    const command = { type: 'room:leave', roomId: 'own-room', commandId: 'leave-id' } as NonNullable<ReturnType<typeof roomStore.getState>['pendingCommand']>;
    await act(async () => {
      roomStore.setState({ accountId: 'a', room: { roomId: 'own-room', title: 'Friday', phase: 'playing' } as NonNullable<ReturnType<typeof roomStore.getState>['room']>, pendingCommand: command });
      disappeared = true;
      await client.invalidateQueries({ queryKey: ['current-room', 'a'] });
    });
    expect(roomStore.getState().pendingCommand).toBe(command);
    expect(roomStore.getState().interruption).toBeNull();
    expect(screen.getByText('Destination content')).toBeVisible();
  });
});
