// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SessionBoundary, SessionProvider, useSession } from './SessionBoundary';

describe('SessionBoundary', () => {
  it('clears the previous wallet cache when a refreshed session switches accounts', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['wallet', 'account-a'], { balance: 7 });
    const reader = vi.fn().mockResolvedValueOnce({ status: 'authenticated', account: { accountId: 'account-a', displayName: 'Alice' } })
      .mockResolvedValueOnce({ status: 'authenticated', account: { accountId: 'account-b', displayName: 'Bob' } });
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client },
      createElement(SessionProvider, { sessionReader: reader, children }));
    const view = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(view.result.current.session.status).toBe('authenticated'));
    await act(async () => { await view.result.current.refresh(); });
    await waitFor(() => expect(client.getQueryData(['wallet', 'account-a'])).toBeUndefined());
    view.unmount();
    client.clear();
  });
  it('keeps an unavailable backend distinct from signed out', () => {
    render(createElement(SessionBoundary, {
      session: { status: 'unavailable' },
      onRetry: vi.fn(),
      children: createElement('p', {}, 'Private room controls'),
    }));

    expect(screen.getByText('The game server is starting.')).toBeVisible();
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
