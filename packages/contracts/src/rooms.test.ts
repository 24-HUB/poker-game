import { describe, expect, it } from 'vitest';

import { roomCommandSchema, roomReplySchema, roomViewSchema } from './rooms.js';

const mutation = {
  commandId: '11111111-1111-4111-8111-111111111111',
  authorityBootId: 'boot-a',
  issuedAt: '2026-09-27T00:00:00.000Z',
};

describe('room contracts', () => {
  it('accepts every planned command shape and keeps sync metadata-free', () => {
    const commands = [
      { type: 'room:create', title: 'Friday table', ...mutation },
      { type: 'room:join', token: 'invite-token', ...mutation },
      { type: 'room:sync', roomId: 'room-a' },
      { type: 'room:takeSeat', roomId: 'room-a', seat: 5, controlEpoch: 2, ...mutation },
      { type: 'room:leave', roomId: 'room-a', controlEpoch: 2, ...mutation },
      { type: 'room:rotateInvite', roomId: 'room-a', controlEpoch: 2, ...mutation },
      { type: 'room:claimControl', roomId: 'room-a', ...mutation },
    ];

    for (const command of commands) expect(roomCommandSchema.safeParse(command).success).toBe(true);
    expect(roomCommandSchema.safeParse({ type: 'room:sync', roomId: 'room-a', ...mutation }).success).toBe(false);
  });

  it('rejects invalid titles, seat indexes, identifiers, and extra fields', () => {
    expect(roomCommandSchema.safeParse({ type: 'room:create', title: 'x'.repeat(25), ...mutation }).success).toBe(false);
    expect(roomCommandSchema.safeParse({ type: 'room:takeSeat', roomId: 'room-a', seat: 6, controlEpoch: 1, ...mutation }).success).toBe(false);
    expect(roomCommandSchema.safeParse({ type: 'room:leave', roomId: 'room-a', controlEpoch: 1, ...mutation, accountId: 'forged' }).success).toBe(false);
    expect(roomCommandSchema.safeParse({ type: 'room:create', title: 'Room', ...mutation, commandId: 'not-a-uuid' }).success).toBe(false);
  });

  it('validates recipient room views and optional private invitation replies', () => {
    const room = {
      roomId: 'room-a',
      title: 'Friday table',
      revision: 3,
      hostAccountId: 'account-a',
      members: [{ accountId: 'account-a', displayName: 'Alice', seat: 0, connected: true }],
      control: { isController: true, epoch: 2 },
    };

    expect(roomViewSchema.parse(room)).toEqual(room);
    expect(roomReplySchema.safeParse({
      room,
      invitation: { token: 'private-token', expiresAt: '2026-09-28T00:00:00.000Z' },
    }).success).toBe(true);
    expect(roomViewSchema.safeParse({ ...room, invitationHash: 'secret' }).success).toBe(false);
    expect(roomReplySchema.safeParse({ room, sessionId: 'private' }).success).toBe(false);
  });
});
