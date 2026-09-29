// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RoomLobby } from './RoomLobby';

describe('RoomLobby', () => {
  it('renders six seats and a host start action', () => {
    render(createElement(RoomLobby, {
      accountId: 'account-a',
      room: {
        roomId: 'room-a',
        title: 'Friday table',
        revision: 4,
        hostAccountId: 'account-a',
        phase: 'waiting',
        sessionId: null,
        members: [{ accountId: 'account-a', displayName: 'Alice', seat: 0, connected: true }],
        control: { isController: true, epoch: 2 },
      },
      status: 'connected',
      pending: false,
      invitationUrl: null,
      message: null,
      canRetryPending: false,
      onTakeSeat: vi.fn(),
      onRotateInvitation: vi.fn(),
      onClaimControl: vi.fn(),
      onLeave: vi.fn(),
      onRetryPending: vi.fn(),
      onStart: vi.fn(),
    }));

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Rotate room invitation' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start poker session' })).toBeDisabled();
    expect(screen.getByText(/chips reset with each session/i)).toBeVisible();
  });
});
