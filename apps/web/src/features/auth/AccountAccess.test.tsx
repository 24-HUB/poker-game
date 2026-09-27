// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountAccess } from './AccountAccess';

afterEach(cleanup);

describe('AccountAccess', () => {
  it('shows backend recovery without presenting the player as signed out', async () => {
    const sessionReader = vi.fn().mockResolvedValue({ status: 'unavailable' });
    const user = userEvent.setup();
    render(createElement(AccountAccess, { sessionReader }));

    expect(await screen.findByText('Server starting')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(sessionReader).toHaveBeenCalledTimes(2);
  });

  it('offers sign-in only after an authoritative unauthenticated response', async () => {
    const sessionReader = vi.fn().mockResolvedValue({ status: 'unauthenticated' });
    render(createElement(AccountAccess, { sessionReader }));

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(screen.queryByText('Server starting')).not.toBeInTheDocument();
  });

  it('shows the verified display name for an authenticated account', async () => {
    const sessionReader = vi.fn().mockResolvedValue({
      status: 'authenticated',
      account: { accountId: 'account-a', displayName: 'Alice with a very long display name' },
    });
    render(createElement(AccountAccess, { sessionReader }));

    expect(await screen.findByText('Alice with a very long display name')).toBeVisible();
  });

  it('clears the verified account only after sign-out succeeds', async () => {
    const user = userEvent.setup();
    const sessionReader = vi.fn().mockResolvedValue({
      status: 'authenticated',
      account: { accountId: 'account-a', displayName: 'Alice' },
    });
    const signOutAction = vi.fn().mockResolvedValue(undefined);
    render(createElement(AccountAccess, { sessionReader, signOutAction }));

    await screen.findByText('Alice');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOutAction).toHaveBeenCalledOnce();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
