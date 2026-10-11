// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomLobby } from './RoomLobby';

describe('RoomLobby', () => {
  afterEach(cleanup);
  it('shows and copies only the invite code with explicit success and failure feedback', async () => {
    const token = 'a'.repeat(43);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const props = {
      accountId: 'a', room: { roomId: 'room', title: 'Friday', revision: 1, hostAccountId: 'a', phase: 'waiting' as const, sessionId: null, members: [], control: { isController: true, epoch: 1 } },
      status: 'connected' as const, pending: false, invitationCode: token, message: null, canRetryPending: false,
      onTakeSeat: vi.fn(), onRotateInvitation: vi.fn(), onClaimControl: vi.fn(), onLeave: vi.fn(), onRetryPending: vi.fn(), onStart: vi.fn(),
    };
    render(<RoomLobby {...props} />);
    expect(screen.getByRole('textbox', { name: 'Invite code' })).toHaveValue(token);
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite code' }));
    await waitFor(() => expect(screen.getByText('Invite code copied.')).toBeVisible());
    expect(writeText).toHaveBeenCalledWith(token);
    writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite code' }));
    expect(await screen.findByText('Copy failed. Select and copy the invite code above.')).toBeVisible();
  });
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
      invitationCode: null,
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
