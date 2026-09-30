// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WalletSummary } from './WalletSummary';
import { useWallet } from './useWallet';

vi.mock('./useWallet', () => ({ useWallet: vi.fn() }));

describe('WalletSummary', () => {
  afterEach(cleanup);

  it('distinguishes loading from a real zero balance', () => {
    vi.mocked(useWallet).mockReturnValue({ isPending: true } as ReturnType<typeof useWallet>);
    const view = render(createElement(WalletSummary, { accountId: 'account-a' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tickets loading');
    vi.mocked(useWallet).mockReturnValue({ isPending: false, isError: false,
      data: { balance: 0, revision: 0, utcDate: '2026-09-30', earnedToday: 0, dailyCap: 20, remainingToday: 20 },
    } as ReturnType<typeof useWallet>);
    view.rerender(createElement(WalletSummary, { accountId: 'account-a' }));
    expect(screen.getByLabelText('0 tickets, 20 can be earned today')).toBeVisible();
  });
});
