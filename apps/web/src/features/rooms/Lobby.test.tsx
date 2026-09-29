// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Lobby } from './Lobby';

describe('Lobby', () => {
  it('submits a validated room title and private invitation', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onJoin = vi.fn();

    render(createElement(Lobby, { onCreate, onJoin, pending: false, error: null }));

    await user.click(screen.getByRole('button', { name: 'Create Room' }));
    await user.type(screen.getByLabelText('Room title'), 'Friday table');
    await user.click(screen.getByRole('button', { name: 'Create private room' }));
    await user.click(screen.getByRole('button', { name: 'Join Room' }));
    await user.type(screen.getByLabelText('Private invitation'), 'private-token');
    await user.click(screen.getByRole('button', { name: 'Join private room' }));

    expect(onCreate).toHaveBeenCalledWith('Friday table');
    expect(onJoin).toHaveBeenCalledWith('private-token');
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
