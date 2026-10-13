// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Lobby } from './Lobby';
afterEach(cleanup);

describe('Lobby', () => {
  it('retains the join form and input through pending and server failure', async () => {
    const user = userEvent.setup();
    const props = { onCreate: vi.fn(), onJoin: vi.fn(), pending: false, error: null };
    const view = render(createElement(Lobby, props));
    await user.click(screen.getByRole('button', { name: 'Join Room' }));
    await user.type(screen.getByLabelText('Invite code'), 'a'.repeat(43));
    await user.click(screen.getByRole('button', { name: 'Join private room' }));
    view.rerender(createElement(Lobby, { ...props, pending: true }));
    expect(screen.getByRole('button', { name: /Join private room|Joining/ })).toBeDisabled();
    view.rerender(createElement(Lobby, { ...props, error: 'This invitation has expired.' }));
    expect(screen.getByLabelText('Invite code')).toHaveValue('a'.repeat(43));
    expect(screen.getByLabelText('Invite code')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('This invitation has expired.');
  });
  it.each(['', 'short', 'a'.repeat(44), 'a'.repeat(42) + '!'])('rejects malformed invitation code %s without sending', async (code) => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    render(createElement(Lobby, { onCreate: vi.fn(), onJoin, pending: false, error: null }));
    await user.click(screen.getByRole('button', { name: 'Join Room' }));
    if (code) await user.type(screen.getByLabelText('Invite code'), code);
    await user.click(screen.getByRole('button', { name: 'Join private room' }));
    expect(onJoin).not.toHaveBeenCalled();
  });
  it('submits a validated room title and private invitation', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onJoin = vi.fn();

    render(createElement(Lobby, { onCreate, onJoin, pending: false, error: null }));

    await user.click(screen.getByRole('button', { name: 'Create Room' }));
    await user.type(screen.getByLabelText('Room title'), 'Friday table');
    await user.click(screen.getByRole('button', { name: 'Create private room' }));
    await user.click(screen.getByRole('button', { name: 'Back to room options' }));
    await user.click(screen.getByRole('button', { name: 'Join Room' }));
    await user.type(screen.getByLabelText('Invite code'), `  ${'a'.repeat(43)}  `);
    await user.click(screen.getByRole('button', { name: 'Join private room' }));

    expect(onCreate).toHaveBeenCalledWith('Friday table');
    expect(onJoin).toHaveBeenCalledWith('a'.repeat(43));
  });

  it('offers an explicit retry for an uncertain command', async () => {
    const user = userEvent.setup();
    const onRetryPending = vi.fn();

    render(createElement(Lobby, {
      onCreate: vi.fn(),
      onJoin: vi.fn(),
      pending: true,
      error: 'The server may have received that command.',
      canRetryPending: true,
      onRetryPending,
    }));

    await user.click(screen.getByRole('button', { name: 'Reconcile pending room action' }));

    expect(onRetryPending).toHaveBeenCalledOnce();
  });
});
