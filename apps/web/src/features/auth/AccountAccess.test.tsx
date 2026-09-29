// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountAccess } from './AccountAccess';
import { readPendingInvitation, storePendingInvitation } from '../rooms/invitation';
import { roomStore } from '../rooms/roomStore';

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
    roomStore.getState().setAccount('account-a');
    roomStore.getState().applySnapshot({
      roomId: 'room-a',
      title: 'Private table',
      revision: 1,
      hostAccountId: 'account-a',
      members: [],
      control: { isController: true, epoch: 1 },
    });
    storePendingInvitation('private-token', sessionStorage);
    render(createElement(AccountAccess, { sessionReader, signOutAction }));

    await screen.findByText('Alice');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOutAction).toHaveBeenCalledOnce();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(roomStore.getState().accountId).toBeNull();
    expect(roomStore.getState().room).toBeNull();
    expect(readPendingInvitation(sessionStorage)).toBeNull();
  });
});
