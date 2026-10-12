// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalMockAccounts } from './LocalMockAccounts';
afterEach(cleanup);
describe('local mock entry', () => {
  it('offers only harness-verified players and completes native-session login', async () => {
    const onAuthenticated = vi.fn();
    const fetcher = vi.fn(async (path: RequestInfo | URL) => new Response(JSON.stringify(String(path).endsWith('mock-accounts') ? { ready: true } : { ok: true })));
    render(<LocalMockAccounts onAuthenticated={onAuthenticated} fetcher={fetcher} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Play as Mock Host' }));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledWith('/__e2e/mock-login', expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify({ player: 'host' }) }));
  });
  it('does not offer mock players without a ready local harness', async () => {
    render(<LocalMockAccounts onAuthenticated={vi.fn()} fetcher={async () => new Response('{}', { status: 404 })} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Play as Mock/ })).not.toBeInTheDocument());
  });
});
