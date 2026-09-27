import { randomUUID } from 'node:crypto';

import type { RoomCommand } from '@poker/contracts' with { 'resolution-mode': 'import' };

import { AuthorityLease } from '../src/authority/authorityLease';
import { applyMigrations } from '../src/database/migrate';
import { TransactionRunner } from '../src/database/transactionRunner';
import { RoomCommandCache } from '../src/modules/rooms/roomCommandCache';
import { RoomRepository } from '../src/modules/rooms/room.repository';
import { RoomRegistry } from '../src/modules/rooms/roomRegistry';
import { RoomService, type RoomContext } from '../src/modules/rooms/room.service';
import { createTestDatabase, type TestDatabase } from './support/testDatabase';

describe('authoritative private rooms', () => {
  let database: TestDatabase;
  let authority: AuthorityLease;
  let rooms: RoomService;
  let bootId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    await applyMigrations(database.db);
    authority = new AuthorityLease(database.db, 'room-test-boot');
    const token = await authority.acquire();
    if (!token) throw new Error('Expected room-test authority');
    authority.markReady(token);
    bootId = token.bootId;
    rooms = new RoomService(
      new RoomRepository(database.db, new TransactionRunner(database.client), authority),
      new RoomRegistry(),
      new RoomCommandCache(),
      authority,
    );
  });

  afterEach(async () => {
    rooms.dispose();
    await database.dispose();
  });

  it('lostCreateAckDoesNotCreateAgain', async () => {
    const host = context('host', 'Host', 'host-tab');
    const command = mutation({ type: 'room:create', title: 'Friday table' });

    const first = await rooms.execute(host, command);
    const retry = await rooms.execute(host, command);

    expect(first.error).toBeNull();
    expect(retry).toEqual(first);
    expect(await database.db.collection('rooms').countDocuments({ status: 'OPEN' })).toBe(1);
    if (first.error || !first.data.invitation) throw new Error('Expected private invitation');
    expect(Buffer.from(first.data.invitation.token, 'base64url')).toHaveLength(32);
    expect(JSON.stringify(await database.db.collection('rooms').findOne({ status: 'OPEN' })))
      .not.toContain(first.data.invitation.token);
    expect(JSON.stringify(await database.db.collection('roomCommands').findOne({ accountId: 'host' })))
      .not.toContain(first.data.invitation.token);
  });

  it('coalesces concurrent copies of one create command to the same private reply', async () => {
    const host = context('host', 'Host', 'host-tab');
    const command = mutation({ type: 'room:create', title: 'One command' });

    const [first, duplicate] = await Promise.all([
      rooms.execute(host, command),
      rooms.execute(host, command),
    ]);

    expect(duplicate).toEqual(first);
    expect(await database.db.collection('rooms').countDocuments({ status: 'OPEN' })).toBe(1);
  });

  it('lastSeatHasOneWinner', async () => {
    const host = context('host', 'Host', 'host-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Six seats' }));
    if (created.error || !created.data.invitation) throw new Error('Expected invitation');
    const token = created.data.invitation.token;

    for (let seat = 1; seat < 5; seat += 1) {
      const joined = await rooms.execute(
        context(`member-${seat}`, `Member ${seat}`, `tab-${seat}`),
        mutation({ type: 'room:join', token }),
      );
      expect(joined.error).toBeNull();
    }

    const attempts = await Promise.all([
      rooms.execute(context('winner-a', 'Winner A', 'tab-a'), mutation({ type: 'room:join', token })),
      rooms.execute(context('winner-b', 'Winner B', 'tab-b'), mutation({ type: 'room:join', token })),
    ]);
    const successes = attempts.filter((reply) => reply.error === null);

    expect(successes).toHaveLength(1);
    expect(attempts.find((reply) => reply.error)?.error?.code).toBe('ROOM_FULL');
    expect(await database.db.collection('roomMemberships').countDocuments({
      roomId: created.data.room?.roomId,
      seat: 5,
      leftAt: null,
    })).toBe(1);
  });

  it('allows one winner when the same account concurrently joins different rooms', async () => {
    const firstRoom = await rooms.execute(
      context('host-a', 'Host A', 'host-a-tab'),
      mutation({ type: 'room:create', title: 'Room A' }),
    );
    const secondRoom = await rooms.execute(
      context('host-b', 'Host B', 'host-b-tab'),
      mutation({ type: 'room:create', title: 'Room B' }),
    );
    if (firstRoom.error || !firstRoom.data.invitation || secondRoom.error || !secondRoom.data.invitation) {
      throw new Error('Expected two rooms');
    }
    const invitee = context('invitee', 'Invitee', 'invitee-tab');

    const attempts = await Promise.all([
      rooms.execute(invitee, mutation({ type: 'room:join', token: firstRoom.data.invitation.token })),
      rooms.execute(invitee, mutation({ type: 'room:join', token: secondRoom.data.invitation.token })),
    ]);

    expect(attempts.filter(({ error }) => error === null)).toHaveLength(1);
    expect(attempts.find(({ error }) => error)?.error?.code).toBe('ALREADY_IN_ROOM');
    expect(await database.db.collection('activeRoomMemberships').countDocuments({ accountId: 'invitee' })).toBe(1);
  });

  it('oldDisconnectCannotRevokeNewControl', async () => {
    const oldTab = context('host', 'Host', 'old-tab');
    const newTab = context('host', 'Host', 'new-tab');
    const created = await rooms.execute(oldTab, mutation({ type: 'room:create', title: 'Control' }));
    if (created.error || !created.data.room) throw new Error('Expected room');

    const observed = await rooms.execute(newTab, { type: 'room:sync', roomId: created.data.room.roomId });
    expect(observed.data?.room?.revision).toBeGreaterThan(created.data.room.revision);
    const takeover = await rooms.execute(
      newTab,
      mutation({ type: 'room:claimControl', roomId: created.data.room.roomId }),
    );
    expect(takeover.data?.room?.control.isController).toBe(true);
    if (takeover.error || !takeover.data.room) throw new Error('Expected takeover');
    const staleMutation = await rooms.execute(oldTab, mutation({
      type: 'room:takeSeat',
      roomId: created.data.room.roomId,
      seat: 1,
      controlEpoch: takeover.data.room.control.epoch,
    }));
    expect(staleMutation.error?.code).toBe('NOT_CONTROLLER');

    await rooms.disconnect(oldTab.connectionId);
    const synced = await rooms.execute(newTab, { type: 'room:sync', roomId: created.data.room.roomId });

    expect(synced.data?.room?.control.isController).toBe(true);
  });

  it('outsiderCannotSync', async () => {
    const created = await rooms.execute(
      context('host', 'Host', 'host-tab'),
      mutation({ type: 'room:create', title: 'Private' }),
    );
    if (created.error || !created.data.room) throw new Error('Expected room');

    const reply = await rooms.execute(
      context('outsider', 'Outsider', 'outsider-tab'),
      { type: 'room:sync', roomId: created.data.room.roomId },
    );

    expect(reply.error?.code).toBe('FORBIDDEN');
  });

  it('rotates invitations privately and rejects both rotated and expired tokens', async () => {
    const host = context('host', 'Host', 'host-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Rotating' }));
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected invitation');
    const oldToken = created.data.invitation.token;

    const rotated = await rooms.execute(host, mutation({
      type: 'room:rotateInvite',
      roomId: created.data.room.roomId,
      controlEpoch: created.data.room.control.epoch,
    }));
    if (rotated.error || !rotated.data.invitation) throw new Error('Expected rotated invitation');
    expect(rotated.data.invitation.token).not.toBe(oldToken);
    expect(rotated.data.room).not.toHaveProperty('invitation');

    const oldReply = await rooms.execute(
      context('old-invitee', 'Old Invitee', 'old-invitee-tab'),
      mutation({ type: 'room:join', token: oldToken }),
    );
    expect(oldReply.error?.code).toBe('INVITATION_INVALID');

    await database.db.collection<{ _id: string }>('rooms').updateOne(
      { _id: created.data.room.roomId },
      { $set: { invitationExpiresAt: new Date(0) } },
    );
    const expiredReply = await rooms.execute(
      context('expired-invitee', 'Expired Invitee', 'expired-invitee-tab'),
      mutation({ type: 'room:join', token: rotated.data.invitation.token }),
    );
    expect(expiredReply.error?.code).toBe('INVITATION_INVALID');
  });

  it('rejects forged host actions and observer-tab mutations', async () => {
    const host = context('host', 'Host', 'host-tab');
    const observer = context('host', 'Host', 'observer-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Authority' }));
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    const joined = await rooms.execute(
      context('member', 'Member', 'member-tab'),
      mutation({ type: 'room:join', token: created.data.invitation.token }),
    );
    if (joined.error || !joined.data.room) throw new Error('Expected member');

    const forgedHost = await rooms.execute(context('member', 'Member', 'member-tab'), mutation({
      type: 'room:rotateInvite',
      roomId: created.data.room.roomId,
      controlEpoch: joined.data.room.control.epoch,
    }));
    expect(forgedHost.error?.code).toBe('FORBIDDEN');

    await rooms.execute(observer, { type: 'room:sync', roomId: created.data.room.roomId });
    const observerMove = await rooms.execute(observer, mutation({
      type: 'room:takeSeat',
      roomId: created.data.room.roomId,
      seat: 2,
      controlEpoch: created.data.room.control.epoch,
    }));
    expect(observerMove.error?.code).toBe('NOT_CONTROLLER');
  });

  it('rejects a changed payload that reuses a command id', async () => {
    const host = context('host', 'Host', 'host-tab');
    const first = mutation({ type: 'room:create', title: 'Original' });
    expect((await rooms.execute(host, first)).error).toBeNull();

    const conflict = await rooms.execute(host, { ...first, title: 'Changed' });

    expect(conflict.error?.code).toBe('COMMAND_CONFLICT');
    expect(await database.db.collection('rooms').countDocuments({ status: 'OPEN' })).toBe(1);
  });

  it('rejects stale authority boot ids before creating a room', async () => {
    const reply = await rooms.execute(context('host', 'Host', 'host-tab'), {
      ...mutation({ type: 'room:create', title: 'Stale' }),
      authorityBootId: 'previous-boot',
    });

    expect(reply.error?.code).toBe('ROOM_CLOSED');
    expect(await database.db.collection('rooms').countDocuments()).toBe(0);
  });

  it.each([
    ['more than 60 seconds ahead', new Date(Date.now() + 120_000).toISOString()],
    ['more than 24 hours old', new Date(Date.now() - 24 * 60 * 60 * 1_000 - 1_000).toISOString()],
  ])('rejects a command issued %s without executing it', async (_case, issuedAt) => {
    const command = { ...mutation({ type: 'room:create', title: 'Invalid clock' }), issuedAt };

    const reply = await rooms.execute(context('host', 'Host', 'host-tab'), command);

    expect(reply.error?.code).toBe('COMMAND_EXPIRED');
    expect(await database.db.collection('rooms').countDocuments()).toBe(0);
    expect(await database.db.collection('roomCommands').countDocuments()).toBe(0);
  });

  it('rejects a new mutation before execution when the retry cache is saturated', async () => {
    rooms.dispose();
    rooms = new RoomService(
      new RoomRepository(database.db, new TransactionRunner(database.client), authority),
      new RoomRegistry(),
      new RoomCommandCache(1),
      authority,
    );
    const host = context('host', 'Host', 'host-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Cache' }));
    if (created.error || !created.data.room) throw new Error('Expected room');

    const rejected = await rooms.execute(host, mutation({
      type: 'room:claimControl',
      roomId: created.data.room.roomId,
    }));

    expect(rejected.error?.code).toBe('RATE_LIMITED');
    expect((await database.db.collection('roomCommands').countDocuments({ accountId: 'host' }))).toBe(1);
  });

  it('transfers host control to the lowest-seat connected member on disconnect', async () => {
    const host = context('host', 'Host', 'host-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Transfer' }));
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    const first = context('first', 'First', 'first-tab');
    const second = context('second', 'Second', 'second-tab');
    await rooms.execute(first, mutation({ type: 'room:join', token: created.data.invitation.token }));
    await rooms.execute(second, mutation({ type: 'room:join', token: created.data.invitation.token }));

    await rooms.disconnect(host.connectionId);
    const synced = await rooms.execute(first, { type: 'room:sync', roomId: created.data.room.roomId });

    expect(synced.data?.room?.hostAccountId).toBe('first');
  });

  it('rolls back persistence before publishing a failed create to the registry', async () => {
    await database.db.command({
      collMod: 'roomMemberships',
      validator: { $jsonSchema: { bsonType: 'object', required: ['impossibleRequiredField'] } },
      validationLevel: 'strict',
      validationAction: 'error',
    });
    const host = context('host', 'Host', 'host-tab');

    await expect(rooms.execute(host, mutation({ type: 'room:create', title: 'Rollback' }))).rejects.toThrow();

    expect(await database.db.collection('rooms').countDocuments()).toBe(0);
    expect(await database.db.collection('roomCommands').countDocuments()).toBe(0);
  });

  it('does not allocate a second seat or steal control when a member joins again', async () => {
    const host = context('host', 'Host', 'host-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Retry join' }));
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    const firstTab = context('member', 'Member', 'member-first');
    const secondTab = context('member', 'Member', 'member-second');
    const joinCommand = mutation({ type: 'room:join', token: created.data.invitation.token });
    const joined = await rooms.execute(firstTab, joinCommand);
    if (joined.error || !joined.data.room) throw new Error('Expected join');

    const joinedAgain = await rooms.execute(secondTab, joinCommand);
    const firstView = await rooms.execute(firstTab, { type: 'room:sync', roomId: created.data.room.roomId });

    expect(joinedAgain.data?.room?.control.isController).toBe(false);
    expect(firstView.data?.room?.control.isController).toBe(true);
    expect(await database.db.collection('roomMemberships').countDocuments({
      roomId: created.data.room.roomId,
      accountId: 'member',
      leftAt: null,
    })).toBe(1);
  });

  it('moves seats, rejects occupied seats, and transfers host on an explicit leave', async () => {
    const host = context('host', 'Host', 'host-tab');
    const member = context('member', 'Member', 'member-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Leaving' }));
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');
    const joined = await rooms.execute(member, mutation({ type: 'room:join', token: created.data.invitation.token }));
    if (joined.error || !joined.data.room) throw new Error('Expected member');

    const occupied = await rooms.execute(host, mutation({
      type: 'room:takeSeat',
      roomId: created.data.room.roomId,
      seat: 1,
      controlEpoch: created.data.room.control.epoch,
    }));
    expect(occupied.error?.code).toBe('SEAT_TAKEN');
    const moved = await rooms.execute(member, mutation({
      type: 'room:takeSeat',
      roomId: created.data.room.roomId,
      seat: 3,
      controlEpoch: joined.data.room.control.epoch,
    }));
    expect(moved.data?.room?.members.find(({ accountId }) => accountId === 'member')?.seat).toBe(3);

    const left = await rooms.execute(host, mutation({
      type: 'room:leave',
      roomId: created.data.room.roomId,
      controlEpoch: created.data.room.control.epoch,
    }));
    expect(left).toEqual({ data: { room: null }, error: null });
    const memberView = await rooms.execute(member, { type: 'room:sync', roomId: created.data.room.roomId });
    expect(memberView.data?.room?.hostAccountId).toBe('member');
  });

  it('closes and invalidates an empty room after the retention window', async () => {
    rooms.dispose();
    rooms = new RoomService(
      new RoomRepository(database.db, new TransactionRunner(database.client), authority),
      new RoomRegistry(),
      new RoomCommandCache(),
      authority,
      { emptyRetentionMs: 20 },
    );
    const host = context('host', 'Host', 'host-tab');
    const created = await rooms.execute(host, mutation({ type: 'room:create', title: 'Temporary' }));
    if (created.error || !created.data.room || !created.data.invitation) throw new Error('Expected room');

    await rooms.disconnect(host.connectionId);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(await database.db.collection<{ _id: string }>('rooms').findOne({
      _id: created.data.room.roomId,
    })).toMatchObject({
      status: 'CLOSED',
      closedReason: 'EMPTY',
    });
    const join = await rooms.execute(
      context('late', 'Late', 'late-tab'),
      mutation({ type: 'room:join', token: created.data.invitation.token }),
    );
    expect(join.error?.code).toBe('INVITATION_INVALID');
  });

  function mutation<T extends Omit<Extract<RoomCommand, { commandId: string }>, 'commandId' | 'authorityBootId' | 'issuedAt'>>(
    command: T,
  ): T & { commandId: string; authorityBootId: string; issuedAt: string } {
    return {
      ...command,
      commandId: randomUUID(),
      authorityBootId: bootId,
      issuedAt: new Date().toISOString(),
    };
  }
});

function context(accountId: string, displayName: string, connectionId: string): RoomContext {
  return {
    connectionId,
    identity: {
      accountId,
      displayName,
      sessionId: `${accountId}-session`,
      expiresAt: new Date(Date.now() + 60_000),
    },
  };
}
