// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HandHistory } from './HandHistory';
import type { HandHistoryPage, Result } from '@poker/contracts';
import { showdownResult } from './handResultFixtures.test-support';

afterEach(cleanup);
function mount(reader: () => Promise<Result<HandHistoryPage>>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><HandHistory accountId="a" roomId="room" sessionId="session" reader={reader} /></QueryClientProvider>);
  return { ...view, client };
}
describe('HandHistory', () => {
  it('uses the committed result panel and keeps disclosed history readable as the next hand runs', async () => {
    const reader = vi.fn(async () => ({ data: { hands: [showdownResult], nextBeforeHandNumber: null }, error: null }));
    const view = mount(reader);
    fireEvent.click(screen.getByRole('button', { name: 'Hand history' }));
    expect(await screen.findByText('Three of a kind, aces')).toBeVisible();
    view.rerender(<QueryClientProvider client={view.client}><HandHistory accountId="a" roomId="room" sessionId="session" latestHandId="hand-next" reader={reader} /></QueryClientProvider>);
    expect(screen.getByRole('button', { name: 'Hand history' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Three of a kind, aces')).toBeVisible();
    expect(screen.getByText('Awarded 1,552 chips')).toBeVisible();
  });
  it('loads only on disclosure and keeps unavailable history recoverable', async () => {
    const reader = vi.fn(async () => ({ data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'offline' } } as Result<HandHistoryPage>));
    mount(reader);
    expect(reader).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hand history' }));
    expect(await screen.findByRole('button', { name: 'Retry hand history' })).toBeVisible();
    expect(screen.queryByText('No completed hands yet.')).not.toBeInTheDocument();
  });
  it('discards an in-flight previous session result', async () => {
    let done!: (result: Result<HandHistoryPage>) => void;
    const reader = () => new Promise<Result<HandHistoryPage>>((resolve) => { done = resolve; });
    const view = mount(reader);
    fireEvent.click(screen.getByRole('button', { name: 'Hand history' }));
    await waitFor(() => expect(done).toBeTypeOf('function'));
    const previous = done;
    view.rerender(<QueryClientProvider client={view.client}><HandHistory accountId="b" roomId="room" sessionId="new-session" reader={reader} /></QueryClientProvider>);
    await act(async () => previous({ data: { hands: [], nextBeforeHandNumber: null }, error: null }));
    expect(screen.queryByText('No completed hands yet.')).not.toBeInTheDocument();
  });
});
