// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionBoundary, SessionProvider, useSession } from './SessionBoundary';
import { AccountAccess } from './AccountAccess';
import type { SessionState } from '../../lib/auth-client';
import { roomStore } from '../rooms/roomStore';

afterEach(() => { cleanup(); vi.useRealTimers(); roomStore.getState().setAccount(null); });

describe('SessionBoundary', () => {
  it('moves the disappearing boundary Retry to the verified account control', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let finish!: (session: SessionState) => void;
    const reader = vi.fn().mockResolvedValueOnce({ status: 'unavailable' })
      .mockImplementationOnce(() => new Promise<SessionState>((resolve) => { finish = resolve; }));
    render(<QueryClientProvider client={client}><SessionProvider sessionReader={reader}>
      <AccountAccess /><SessionBoundary><button type="button">Private room action</button></SessionBoundary>
    </SessionProvider></QueryClientProvider>);
    await screen.findAllByRole('button', { name: 'Retry' });
    const retry = screen.getAllByRole('button', { name: 'Retry' })[1]!;
    act(() => retry.focus()); fireEvent.click(retry);
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    await act(async () => finish({ status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } }));
    expect(screen.getByText('Alice').closest('[data-account-control]')).toHaveFocus();
    client.clear();
  });
  it('shares a single recovery budget between header and boundary across rerenders', async () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const reader = vi.fn().mockResolvedValue({ status: 'unavailable', reason: 'retryable' });
    const view = render(<QueryClientProvider client={client}><SessionProvider sessionReader={reader}>
      <AccountAccess /><SessionBoundary><p>Private room controls</p></SessionBoundary>
    </SessionProvider></QueryClientProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(reader).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Connecting to server…')).toHaveLength(2);
    client.setQueryData(['wallet', 'account-a'], { balance: 7 });
    roomStore.getState().setAccount('account-a');
    fireEvent.focus(window);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(reader).toHaveBeenCalledTimes(1);
    view.rerender(<QueryClientProvider client={client}><SessionProvider sessionReader={reader}>
      <AccountAccess /><SessionBoundary><p>A different destination</p></SessionBoundary>
    </SessionProvider></QueryClientProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(screen.getAllByText('Server unavailable. Please try again.')).toHaveLength(2);
    expect(reader).toHaveBeenCalledTimes(18);
    expect(client.getQueryData(['wallet', 'account-a'])).toEqual({ balance: 7 });
    expect(roomStore.getState().accountId).toBe('account-a');
    expect(screen.queryByText('A different destination')).not.toBeInTheDocument();
    client.clear();
  });
  it('invalidates a query read before successful sign-out and ignores its late identity', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let finish!: (session: SessionState) => void;
    const reader = vi.fn().mockResolvedValueOnce({ status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } })
      .mockImplementationOnce(() => new Promise<SessionState>((resolve) => { finish = resolve; }));
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}><SessionProvider sessionReader={reader} signOutAction={async () => {}}>{children}</SessionProvider></QueryClientProvider>;
    const view = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(view.result.current.session.status).toBe('authenticated'));
    act(() => { void view.result.current.refresh(); });
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    await act(async () => { await view.result.current.signOut(); });
    await act(async () => finish({ status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } }));
    expect(view.result.current.session).toEqual({ status: 'unauthenticated' });
    expect(client.getQueryData(['session'])).toEqual({ status: 'unauthenticated' });
    view.unmount(); client.clear();
  });
  it('clears the previous wallet cache when a refreshed session switches accounts', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['wallet', 'account-a'], { balance: 7 });
    client.setQueryData(['collection', 'account-a'], { items: ['private-owned-item'] });
    client.setQueryData(['equipment', 'account-a'], { avatar: 'private-owned-item' });
    const reader = vi.fn().mockResolvedValueOnce({ status: 'authenticated', account: { accountId: 'account-a', displayName: 'Alice' } })
      .mockResolvedValueOnce({ status: 'authenticated', account: { accountId: 'account-b', displayName: 'Bob' } });
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client },
      createElement(SessionProvider, { sessionReader: reader, children }));
    const view = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(view.result.current.session.status).toBe('authenticated'));
    await act(async () => { await view.result.current.refresh(); });
    await waitFor(() => expect(client.getQueryData(['wallet', 'account-a'])).toBeUndefined());
    expect(client.getQueryData(['collection', 'account-a'])).toBeUndefined();
    expect(client.getQueryData(['equipment', 'account-a'])).toBeUndefined();
    view.unmount();
    client.clear();
  });
  it('keeps an unavailable backend distinct from signed out', () => {
    render(createElement(SessionBoundary, {
      session: { status: 'unavailable' },
      onRetry: vi.fn(),
      children: createElement('p', {}, 'Private room controls'),
    }));

    expect(screen.getByText('Server unavailable. Please try again.')).toBeVisible();
    expect(screen.queryByText('Sign in to enter a private room.')).not.toBeInTheDocument();
    expect(screen.queryByText('Private room controls')).not.toBeInTheDocument();
  });

  it('renders private content only for a verified account', () => {
    render(createElement(SessionBoundary, {
      session: { status: 'authenticated', account: { accountId: 'account-a', displayName: 'Alice' } },
      onRetry: vi.fn(),
      children: createElement('p', {}, 'Private room controls'),
    }));

    expect(screen.getByText('Private room controls')).toBeVisible();
  });
});
