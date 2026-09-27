// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Lobby } from './Lobby';

describe('Lobby', () => {
  it('lobbyInvokesCreateAndJoin', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onJoin = vi.fn();

    render(createElement(Lobby, { onCreate, onJoin }));

    await user.click(screen.getByRole('button', { name: 'Create Room' }));
    await user.click(screen.getByRole('button', { name: 'Join Room' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onJoin).toHaveBeenCalledOnce();
  });
});
