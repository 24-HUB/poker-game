// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cosmeticItemSchema, type PullReceipt } from '@poker/contracts';
import manifest from '../../../public/art/cosmetics/manifest.json';
import { Banner } from './Banner';
import { readPendingPull } from './pendingPull';

const mocks = vi.hoisted(() => ({ owner: 'alice', get: vi.fn(), mutate: vi.fn(), refresh: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiGet: mocks.get }));
vi.mock('../../lib/economy-api', () => ({ economyMutation: mocks.mutate }));
vi.mock('../auth/SessionBoundary', () => ({
  useSession: () => ({ session: { status: 'authenticated', account: { accountId: mocks.owner } }, refresh: mocks.refresh }),
  SessionBoundary: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../wallet/useWallet', () => ({ useWallet: () => ({ data: { balance: 5 }, refetch: vi.fn() }) }));
vi.mock('../collection/useAccountSync', () => ({ useAccountSync: vi.fn() }));
const banner = { id: 'celestial', version: 'celestial-v1', name: 'Celestial Companions', items: manifest.items,
  prices: { single: 5, ten: 50 }, weights: { R: 70, SR: 25, SSR: 5 }, guarantees: { sr: 10, ssr: 90 } };
const failure = (code: string) => ({ data: null, error: { code, message: code } });
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><Banner /></QueryClientProvider>);
}
beforeEach(() => {
  mocks.owner = 'alice'; sessionStorage.clear();
  mocks.get.mockImplementation(async (path: string) => path === '/api/banner' ? { data: banner, error: null } : failure('NOT_FOUND'));
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.resetAllMocks(); vi.unstubAllGlobals(); });

it('keeps the original identity after an uncertain response and retries only that purchase', async () => {
  mocks.mutate.mockResolvedValue(failure('COMMAND_UNCERTAIN'));
  mount(); await screen.findByRole('button', { name: 'Open 1 — 5 tickets' });
  fireEvent.click(screen.getByRole('button', { name: 'Open 1 — 5 tickets' }));
  await screen.findByRole('heading', { name: 'Recover your invitation' });
  const pending = readPendingPull('alice'); expect(pending).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Recover existing invitation' }));
  await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(2));
  expect(mocks.mutate.mock.calls[0]![2]).toEqual(pending);
  expect(mocks.mutate.mock.calls[1]![2]).toEqual(pending);
  expect(readPendingPull('alice')).toEqual(pending);
});

it('clears a definitive stale catalogue rejection and shows the refreshed price before retry', async () => {
  mocks.mutate.mockResolvedValue(failure('STALE_BANNER'));
  mount(); await screen.findByRole('button', { name: 'Open 1 — 5 tickets' });
  mocks.get.mockResolvedValue({ data: { ...banner, version: 'celestial-v2', prices: { single: 7, ten: 70 } }, error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Open 1 — 5 tickets' }));
  expect(await screen.findByRole('button', { name: 'Open 1 — 7 tickets' })).toBeDisabled();
  expect(readPendingPull('alice')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Recover existing invitation' })).not.toBeInTheDocument();
});

it('does not reveal another account’s late response and preserves its recovery identity', async () => {
  let finish!: (value: unknown) => void;
  mocks.mutate.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = mount(); await screen.findByRole('button', { name: 'Open 1 — 5 tickets' });
  fireEvent.click(screen.getByRole('button', { name: 'Open 1 — 5 tickets' }));
  const pending = readPendingPull('alice')!;
  mocks.owner = 'bob'; view.rerender(<QueryClientProvider client={clients[0]!}><Banner /></QueryClientProvider>);
  const item = cosmeticItemSchema.parse(manifest.items[0]);
  await act(async () => finish({ data: { ...pending, cost: 5, results: [{ itemId: item.id, item, rarity: item.rarity, duplicate: false, progress: { sinceSr: 1, sinceSsr: 1 } }], progress: { sinceSr: 1, sinceSsr: 1 },
    committedAt: '2026-10-01T10:00:00Z', walletRevision: 1 } satisfies PullReceipt, error: null }));
  expect(screen.queryByRole('heading', { name: /^Your invitations$/ })).not.toBeInTheDocument();
  expect(readPendingPull('alice')).toEqual(pending); expect(readPendingPull('bob')).toBeNull();
});
