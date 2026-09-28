import type { RoomView } from '@poker/contracts';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createRoomStore } from './roomStore';

function room(revision: number, roomId = 'room-a'): RoomView {
  return {
    roomId,
    title: 'Private table',
    revision,
    hostAccountId: 'account-a',
    members: [],
    control: { isController: true, epoch: 1 },
  };
}

describe('roomStore', () => {
  it('ignoresOlderSnapshot', () => {
    const store = createRoomStore();

    store.getState().applySnapshot(room(7));
    store.getState().applySnapshot(room(6));

    expect(store.getState().room?.revision).toBe(7);
  });

  it('clears private room state when the account changes', () => {
    const store = createRoomStore();
    store.getState().setAccount('account-a');
    store.getState().applySnapshot(room(3));
    store.getState().setInvitation({ token: 'private-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });

    store.getState().setAccount('account-b');

    expect(store.getState().room).toBeNull();
    expect(store.getState().pendingCommand).toBeNull();
    expect(store.getState().invitation).toBeNull();
  });

  it('keeps the same pending command identity until its outcome is known', () => {
    const store = createRoomStore();
    const commandId = randomUUID();
    const command = {
      type: 'room:create' as const,
      title: 'Private table',
      commandId,
      authorityBootId: 'boot-a',
      issuedAt: new Date().toISOString(),
    };

    store.getState().setPendingCommand(command);

    expect(store.getState().pendingCommand?.commandId).toBe(commandId);
    expect(store.getState().pendingCommand).toBe(command);
  });
});
