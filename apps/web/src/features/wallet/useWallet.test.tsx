// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import { apiGet } from '../../lib/api';
import { useWallet } from './useWallet';

vi.mock('../../lib/api', () => ({ apiGet: vi.fn() }));
afterEach(() => { vi.useRealTimers(); focusManager.setFocused(undefined); });

it('refetches durable progress after missed notifications on focus and at UTC midnight', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const data = { balance: 7, revision: 1, utcDate: '2026-09-30', earnedToday: 20, dailyCap: 20, remainingToday: 0 };
  vi.mocked(apiGet).mockResolvedValue({ data, error: null });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const view = renderHook(() => useWallet('alice'), { wrapper });
  await waitFor(() => expect(view.result.current.data?.balance).toBe(7));
  focusManager.setFocused(false);
  vi.mocked(apiGet).mockResolvedValue({ data: { ...data, balance: 8, revision: 2 }, error: null });
  act(() => focusManager.setFocused(true));
  await waitFor(() => expect(view.result.current.data?.balance).toBe(8));
  view.unmount();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T23:59:59Z'));
  const midnight = renderHook(() => useWallet('alice'), { wrapper });
  vi.mocked(apiGet).mockResolvedValue({ data: { ...data, balance: 8, utcDate: '2026-10-01', earnedToday: 0, remainingToday: 20 }, error: null });
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
  expect(client.getQueryData(['wallet', 'alice'])).toMatchObject({ balance: 8, remainingToday: 20, utcDate: '2026-10-01' });
  midnight.unmount();
  client.clear();
});
