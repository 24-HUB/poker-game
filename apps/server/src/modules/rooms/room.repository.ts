import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { ClientSession, Db } from 'mongodb';

import { AuthorityLease, type AuthorityToken } from '../../authority/authorityLease';
import { MONGO_DB, TRANSACTION_RUNNER } from '../../database/database.tokens';
import { TransactionRunner } from '../../database/transactionRunner';
import type { InternalRoom, InternalRoomMember } from './roomController';

export type StoredCommandOutcome =
  | { ok: true; roomId: string; controllerAssigned?: boolean; controllerEpoch?: number; roomNull?: boolean }
  | { ok: false; code: string; message: string };

export type StoredRoomCommand = {
  accountId: string;
  commandId: string;
  payloadHash: string;
  type: string;
  issuedAt: Date;
  expiresAt: Date;
  outcome: StoredCommandOutcome;
};

type RoomDocument = {
  _id: string;
  hostAccountId: string;
  title: string;
  status: 'OPEN' | 'CLOSED';
  phase?: 'waiting' | 'playing';
  sessionId?: string | null;
  revision: number;
  invitationHash: string;
  invitationExpiresAt: Date;
  authorityBootId: string;
  authorityEpoch: number;
  createdAt: Date;
  expiresAt: Date;
  closedReason?: 'LEFT' | 'EMPTY' | 'RESTARTED';
};

type MembershipDocument = {
  _id: string;
  roomId: string;
  accountId: string;
  displayName: string;
  seat: number | null;
  controllerConnectionId: string | null;
  controllerEpoch: number;
  joinedAt: Date;
  leftAt: Date | null;
  pendingDeparture?: boolean;
};

type CommandInput = {
  accountId: string;
  commandId: string;
  payloadHash: string;
  type: string;
  issuedAt: Date;
};

type ActiveRoomMembershipDocument = {
  _id: string;
  roomId: string;
  accountId: string;
  joinedAt: Date;
};

@Injectable()
export class RoomRepository {
  public constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    private readonly authority: AuthorityLease,
  ) {}

  public async findCommand(accountId: string, commandId: string): Promise<StoredRoomCommand | null> {
    return this.db.collection<StoredRoomCommand>('roomCommands').findOne({ accountId, commandId });
  }

  public async findRoomIdByInvitation(invitationHash: string): Promise<string | null> {
    const room = await this.db.collection<RoomDocument>('rooms').findOne(
      { status: 'OPEN', invitationHash },
      { projection: { _id: 1 } },
    );
    return room?._id ?? null;
  }

  public async recordFailure(
    input: CommandInput & { authority: AuthorityToken },
    code: string,
    message: string,
  ): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);
      return this.record(input, { ok: false, code, message }, session);
    });
  }

  public async load(roomId: string): Promise<InternalRoom | null> {
    const room = await this.db.collection<RoomDocument>('rooms').findOne({ _id: roomId, status: 'OPEN' });
    if (!room) return null;
    const memberships = await this.db.collection<MembershipDocument>('roomMemberships')
      .find({ roomId, leftAt: null })
      .toArray();
    return toInternalRoom(room, memberships);
  }

  public async closedReason(roomId: string): Promise<'LEFT' | 'EMPTY' | 'RESTARTED' | null> {
    const room = await this.db.collection<RoomDocument>('rooms').findOne(
      { _id: roomId, status: 'CLOSED' },
      { projection: { closedReason: 1 } },
    );
    return room?.closedReason ?? null;
  }

  public async create(input: CommandInput & {
    roomId: string;
    title: string;
    invitationHash: string;
    invitationExpiresAt: Date;
    connectionId: string;
    displayName: string;
    now: Date;
    authority: AuthorityToken;
  }): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);

      const active = await this.db.collection<ActiveRoomMembershipDocument>('activeRoomMemberships').findOne(
        { _id: input.accountId },
        { session },
      );
      if (active) return this.record(input, {
        ok: false,
        code: 'ALREADY_IN_ROOM',
        message: 'Leave the current room before creating another.',
      }, session);

      await this.db.collection<RoomDocument>('rooms').insertOne({
        _id: input.roomId,
        hostAccountId: input.accountId,
        title: input.title,
        status: 'OPEN',
        phase: 'waiting',
        sessionId: null,
        revision: 1,
        invitationHash: input.invitationHash,
        invitationExpiresAt: input.invitationExpiresAt,
        authorityBootId: input.authority.bootId,
        authorityEpoch: input.authority.epoch,
        createdAt: input.now,
        expiresAt: input.invitationExpiresAt,
      }, { session });
      await this.db.collection<MembershipDocument>('roomMemberships').insertOne({
        _id: membershipId(input.roomId, input.accountId),
        roomId: input.roomId,
        accountId: input.accountId,
        displayName: input.displayName,
        seat: 0,
        controllerConnectionId: input.connectionId,
        controllerEpoch: 1,
        joinedAt: input.now,
        leftAt: null,
      }, { session });
      await this.db.collection<ActiveRoomMembershipDocument>('activeRoomMemberships').insertOne({
        _id: input.accountId,
        roomId: input.roomId,
        accountId: input.accountId,
        joinedAt: input.now,
      }, { session });
      return this.record(input, {
        ok: true,
        roomId: input.roomId,
        controllerAssigned: true,
        controllerEpoch: 1,
      }, session);
    });
  }

  public async join(input: CommandInput & {
    roomId: string;
    invitationHash: string;
    connectionId: string;
    displayName: string;
    now: Date;
    authority: AuthorityToken;
  }): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne({
        _id: input.roomId,
        status: 'OPEN',
        invitationHash: input.invitationHash,
        invitationExpiresAt: { $gt: input.now },
        authorityBootId: input.authority.bootId,
        authorityEpoch: input.authority.epoch,
      }, { session });
      if (!room) return this.record(input, {
        ok: false,
        code: 'INVITATION_INVALID',
        message: 'The room invitation is invalid or expired.',
      }, session);

      const existing = await this.db.collection<MembershipDocument>('roomMemberships').findOne({
        roomId: input.roomId,
        accountId: input.accountId,
        leftAt: null,
      }, { session });
      if (existing) return this.record(input, { ok: true, roomId: input.roomId }, session);
      if (room.phase === 'playing') return this.record(input, {
        ok: false, code: 'SESSION_IN_PROGRESS', message: 'Try again after this session.',
      }, session);

      const active = await this.db.collection<ActiveRoomMembershipDocument>('activeRoomMemberships').findOne(
        { _id: input.accountId },
        { session },
      );
      if (active) return this.record(input, {
        ok: false,
        code: 'ALREADY_IN_ROOM',
        message: 'Leave the current room before joining another.',
      }, session);

      const occupied = await this.db.collection<MembershipDocument>('roomMemberships')
        .find({ roomId: input.roomId, leftAt: null, seat: { $ne: null } }, { session })
        .project<{ seat: number }>({ seat: 1 })
        .toArray();
      const occupiedSeats = new Set(occupied.map(({ seat }) => seat));
      const seat = [0, 1, 2, 3, 4, 5].find((candidate) => !occupiedSeats.has(candidate));
      if (seat === undefined) return this.record(input, {
        ok: false,
        code: 'ROOM_FULL',
        message: 'The room already has six seated members.',
      }, session);

      await this.db.collection<MembershipDocument>('roomMemberships').insertOne({
        _id: membershipId(input.roomId, input.accountId),
        roomId: input.roomId,
        accountId: input.accountId,
        displayName: input.displayName,
        seat,
        controllerConnectionId: input.connectionId,
        controllerEpoch: 1,
        joinedAt: input.now,
        leftAt: null,
      }, { session });
      await this.db.collection<ActiveRoomMembershipDocument>('activeRoomMemberships').insertOne({
        _id: input.accountId,
        roomId: input.roomId,
        accountId: input.accountId,
        joinedAt: input.now,
      }, { session });
      await this.db.collection<RoomDocument>('rooms').updateOne(
        { _id: input.roomId },
        { $inc: { revision: 1 } },
        { session },
      );
      return this.record(input, {
        ok: true,
        roomId: input.roomId,
        controllerAssigned: true,
        controllerEpoch: 1,
      }, session);
    });
  }

  public async claimControl(input: CommandInput & {
    roomId: string;
    connectionId: string;
    authority: AuthorityToken;
  }): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne({
        _id: input.roomId,
        status: 'OPEN',
        authorityBootId: input.authority.bootId,
        authorityEpoch: input.authority.epoch,
      }, { session });
      if (!room) return this.record(input, {
        ok: false,
        code: 'ROOM_CLOSED',
        message: 'The room is no longer available.',
      }, session);
      const membership = await this.db.collection<MembershipDocument>('roomMemberships').findOneAndUpdate(
        { roomId: input.roomId, accountId: input.accountId, leftAt: null },
        { $set: { controllerConnectionId: input.connectionId }, $inc: { controllerEpoch: 1 } },
        { session, returnDocument: 'after' },
      );
      if (!membership) return this.record(input, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Only room members can claim control.',
      }, session);
      const roomUpdate = await this.db.collection<RoomDocument>('rooms').updateOne(
        {
          _id: input.roomId,
          status: 'OPEN',
          authorityBootId: input.authority.bootId,
          authorityEpoch: input.authority.epoch,
        },
        { $inc: { revision: 1 } },
        { session },
      );
      if (roomUpdate.matchedCount !== 1) return this.record(input, {
        ok: false,
        code: 'ROOM_CLOSED',
        message: 'The room is no longer available.',
      }, session);
      return this.record(input, {
        ok: true,
        roomId: input.roomId,
        controllerAssigned: true,
        controllerEpoch: membership.controllerEpoch,
      }, session);
    });
  }

  public async takeSeat(input: CommandInput & {
    roomId: string;
    connectionId: string;
    controlEpoch: number;
    seat: number;
    authority: AuthorityToken;
  }): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne({
        _id: input.roomId,
        status: 'OPEN',
        authorityBootId: input.authority.bootId,
        authorityEpoch: input.authority.epoch,
      }, { session });
      if (!room) return this.record(input, {
        ok: false,
        code: 'ROOM_CLOSED',
        message: 'The room is no longer available.',
      }, session);
      if (room.phase === 'playing') return this.record(input, {
        ok: false, code: 'SESSION_IN_PROGRESS', message: 'Seats are locked during a session.',
      }, session);
      const membership = await this.db.collection<MembershipDocument>('roomMemberships').findOne({
        roomId: input.roomId,
        accountId: input.accountId,
        leftAt: null,
      }, { session });
      if (!membership) return this.record(input, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Only room members can change seats.',
      }, session);
      if (
        membership.controllerConnectionId !== input.connectionId
        || membership.controllerEpoch !== input.controlEpoch
      ) return this.record(input, {
        ok: false,
        code: 'NOT_CONTROLLER',
        message: 'This tab does not control the room member.',
      }, session);
      if (membership.seat === input.seat) {
        return this.record(input, { ok: true, roomId: input.roomId }, session);
      }
      const occupied = await this.db.collection<MembershipDocument>('roomMemberships').findOne({
        roomId: input.roomId,
        seat: input.seat,
        leftAt: null,
      }, { session });
      if (occupied) return this.record(input, {
        ok: false,
        code: 'SEAT_TAKEN',
        message: 'That seat is already occupied.',
      }, session);
      await this.db.collection<MembershipDocument>('roomMemberships').updateOne(
        { _id: membership._id },
        { $set: { seat: input.seat } },
        { session },
      );
      await this.db.collection<RoomDocument>('rooms').updateOne(
        {
          _id: input.roomId,
          status: 'OPEN',
          authorityBootId: input.authority.bootId,
          authorityEpoch: input.authority.epoch,
        },
        { $inc: { revision: 1 } },
        { session },
      );
      return this.record(input, { ok: true, roomId: input.roomId }, session);
    });
  }

  public async rotateInvitation(input: CommandInput & {
    roomId: string;
    connectionId: string;
    controlEpoch: number;
    invitationHash: string;
    invitationExpiresAt: Date;
    authority: AuthorityToken;
  }): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne(
        {
          _id: input.roomId,
          status: 'OPEN',
          authorityBootId: input.authority.bootId,
          authorityEpoch: input.authority.epoch,
        },
        { session },
      );
      if (!room) return this.record(input, {
        ok: false,
        code: 'ROOM_CLOSED',
        message: 'The room is no longer available.',
      }, session);
      if (room.hostAccountId !== input.accountId) return this.record(input, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Only the room host can rotate its invitation.',
      }, session);
      const membership = await this.db.collection<MembershipDocument>('roomMemberships').findOne({
        roomId: input.roomId,
        accountId: input.accountId,
        leftAt: null,
      }, { session });
      if (
        !membership
        || membership.controllerConnectionId !== input.connectionId
        || membership.controllerEpoch !== input.controlEpoch
      ) return this.record(input, {
        ok: false,
        code: 'NOT_CONTROLLER',
        message: 'This tab does not control the host account.',
      }, session);
      await this.db.collection<RoomDocument>('rooms').updateOne(
        {
          _id: input.roomId,
          status: 'OPEN',
          authorityBootId: input.authority.bootId,
          authorityEpoch: input.authority.epoch,
        },
        {
          $set: {
            invitationHash: input.invitationHash,
            invitationExpiresAt: input.invitationExpiresAt,
            expiresAt: input.invitationExpiresAt,
          },
          $inc: { revision: 1 },
        },
        { session },
      );
      return this.record(input, { ok: true, roomId: input.roomId }, session);
    });
  }

  public async leave(input: CommandInput & {
    roomId: string;
    connectionId: string;
    controlEpoch: number;
    connectedAccountIds: Set<string>;
    now: Date;
    authority: AuthorityToken;
  }): Promise<StoredCommandOutcome> {
    return this.transactions.run(async (session) => {
      const duplicate = await this.findCommandInSession(input.accountId, input.commandId, session);
      if (duplicate) return duplicate.outcome;
      await this.authority.fence(session, input.authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne(
        {
          _id: input.roomId,
          status: 'OPEN',
          authorityBootId: input.authority.bootId,
          authorityEpoch: input.authority.epoch,
        },
        { session },
      );
      if (!room) return this.record(input, {
        ok: false,
        code: 'ROOM_CLOSED',
        message: 'The room is no longer available.',
      }, session);
      const membership = await this.db.collection<MembershipDocument>('roomMemberships').findOne({
        roomId: input.roomId,
        accountId: input.accountId,
        leftAt: null,
      }, { session });
      if (!membership) return this.record(input, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Only room members can leave this room.',
      }, session);
      if (
        membership.controllerConnectionId !== input.connectionId
        || membership.controllerEpoch !== input.controlEpoch
      ) return this.record(input, {
        ok: false,
        code: 'NOT_CONTROLLER',
        message: 'This tab does not control the room member.',
      }, session);

      if (room.phase === 'playing') {
        await this.db.collection<MembershipDocument>('roomMemberships').updateOne(
          { _id: membership._id },
          { $set: { pendingDeparture: true, controllerConnectionId: null } },
          { session },
        );
        const connected = await this.db.collection<MembershipDocument>('roomMemberships')
          .find({ roomId: input.roomId, accountId: { $in: [...input.connectedAccountIds] }, leftAt: null }, { session })
          .sort({ seat: 1 }).toArray();
        const nextHost = room.hostAccountId === input.accountId
          ? connected[0]?.accountId ?? room.hostAccountId : room.hostAccountId;
        await this.db.collection<RoomDocument>('rooms').updateOne(
          { _id: input.roomId, status: 'OPEN', phase: 'playing' },
          { $set: { hostAccountId: nextHost }, $inc: { revision: 1 } }, { session },
        );
        return this.record(input, { ok: true, roomId: input.roomId, roomNull: true }, session);
      }

      await this.db.collection<MembershipDocument>('roomMemberships').updateOne(
        { _id: membership._id },
        { $set: { seat: null, controllerConnectionId: null, leftAt: input.now } },
        { session },
      );
      await this.db.collection<ActiveRoomMembershipDocument>('activeRoomMemberships').deleteOne(
        { _id: input.accountId, roomId: input.roomId },
        { session },
      );
      const remaining = await this.db.collection<MembershipDocument>('roomMemberships')
        .find({ roomId: input.roomId, leftAt: null }, { session })
        .sort({ seat: 1 })
        .toArray();
      if (remaining.length === 0) {
        await this.db.collection<RoomDocument>('rooms').updateOne(
          {
            _id: input.roomId,
            status: 'OPEN',
            authorityBootId: input.authority.bootId,
            authorityEpoch: input.authority.epoch,
          },
          {
            $set: { status: 'CLOSED', closedAt: input.now, closedReason: 'LEFT' },
            $unset: { invitationHash: '', invitationExpiresAt: '' },
            $inc: { revision: 1 },
          },
          { session },
        );
      } else {
        const connected = remaining.find(({ accountId }) => input.connectedAccountIds.has(accountId));
        const nextHost = room.hostAccountId === input.accountId
          ? (connected ?? remaining[0])?.accountId
          : room.hostAccountId;
        await this.db.collection<RoomDocument>('rooms').updateOne(
          {
            _id: input.roomId,
            status: 'OPEN',
            authorityBootId: input.authority.bootId,
            authorityEpoch: input.authority.epoch,
          },
          { $set: { hostAccountId: nextHost }, $inc: { revision: 1 } },
          { session },
        );
      }
      return this.record(input, { ok: true, roomId: input.roomId, roomNull: true }, session);
    });
  }

  public async closeEmpty(roomId: string, authority: AuthorityToken, now: Date): Promise<void> {
    await this.transactions.run(async (session) => {
      await this.authority.fence(session, authority);
      const closed = await this.db.collection<RoomDocument>('rooms').updateOne(
        {
          _id: roomId,
          status: 'OPEN',
          authorityBootId: authority.bootId,
          authorityEpoch: authority.epoch,
        },
        {
          $set: { status: 'CLOSED', closedAt: now, closedReason: 'EMPTY' },
          $unset: { invitationHash: '', invitationExpiresAt: '' },
          $inc: { revision: 1 },
        },
        { session },
      );
      if (closed.modifiedCount === 0) return;
      await this.db.collection<MembershipDocument>('roomMemberships').updateMany(
        { roomId, leftAt: null },
        { $set: { seat: null, controllerConnectionId: null, leftAt: now } },
        { session },
      );
      await this.db.collection<ActiveRoomMembershipDocument>('activeRoomMemberships').deleteMany(
        { roomId },
        { session },
      );
    });
  }

  public async touchConnection(roomId: string, authority: AuthorityToken, accountId?: string): Promise<boolean> {
    return this.transactions.run(async (session) => {
      await this.authority.fence(session, authority);
      const result = await this.db.collection<RoomDocument>('rooms').updateOne(
        {
          _id: roomId,
          status: 'OPEN',
          authorityBootId: authority.bootId,
          authorityEpoch: authority.epoch,
        },
        { $inc: { revision: 1 } },
        { session },
      );
      if (result.modifiedCount === 1 && accountId) {
        await this.db.collection<MembershipDocument>('roomMemberships').updateOne(
          { roomId, accountId, leftAt: null, pendingDeparture: true },
          { $set: { pendingDeparture: false } }, { session },
        );
      }
      return result.modifiedCount === 1;
    });
  }

  public async disconnectController(
    roomId: string,
    accountId: string,
    connectionId: string,
    connectedAccountIds: Set<string>,
    authority: AuthorityToken,
  ): Promise<void> {
    await this.transactions.run(async (session) => {
      await this.authority.fence(session, authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne(
        {
          _id: roomId,
          status: 'OPEN',
          authorityBootId: authority.bootId,
          authorityEpoch: authority.epoch,
        },
        { session },
      );
      if (!room) return;
      const cleared = await this.db.collection<MembershipDocument>('roomMemberships').updateOne(
        { roomId, accountId, leftAt: null, controllerConnectionId: connectionId },
        { $set: { controllerConnectionId: null } },
        { session },
      );
      if (cleared.modifiedCount === 0) return;

      let nextHost = room.hostAccountId;
      if (room.hostAccountId === accountId && !connectedAccountIds.has(accountId)) {
        const candidates = await this.db.collection<MembershipDocument>('roomMemberships')
          .find({ roomId, accountId: { $in: [...connectedAccountIds] }, leftAt: null }, { session })
          .sort({ seat: 1 })
          .toArray();
        nextHost = candidates[0]?.accountId ?? room.hostAccountId;
      }
      await this.db.collection<RoomDocument>('rooms').updateOne(
        {
          _id: roomId,
          status: 'OPEN',
          authorityBootId: authority.bootId,
          authorityEpoch: authority.epoch,
        },
        { $set: { hostAccountId: nextHost }, $inc: { revision: 1 } },
        { session },
      );
    });
  }

  private async findCommandInSession(
    accountId: string,
    commandId: string,
    session: ClientSession,
  ): Promise<StoredRoomCommand | null> {
    return this.db.collection<StoredRoomCommand>('roomCommands').findOne(
      { accountId, commandId },
      { session },
    );
  }

  private async record(
    input: CommandInput,
    outcome: StoredCommandOutcome,
    session: ClientSession,
  ): Promise<StoredCommandOutcome> {
    await this.db.collection<StoredRoomCommand>('roomCommands').insertOne({
      accountId: input.accountId,
      commandId: input.commandId,
      payloadHash: input.payloadHash,
      type: input.type,
      issuedAt: input.issuedAt,
      expiresAt: new Date(input.issuedAt.getTime() + 24 * 60 * 60 * 1_000),
      outcome,
    }, { session });
    return outcome;
  }
}

function membershipId(roomId: string, accountId: string): string {
  return `${roomId}:${accountId}`;
}

function toInternalRoom(room: RoomDocument, memberships: MembershipDocument[]): InternalRoom {
  return {
    roomId: room._id,
    title: room.title,
    revision: room.revision,
    hostAccountId: room.hostAccountId,
    invitationHash: room.invitationHash,
    invitationExpiresAt: room.invitationExpiresAt,
    authorityBootId: room.authorityBootId,
    authorityEpoch: room.authorityEpoch,
    phase: room.phase ?? 'waiting',
    sessionId: room.sessionId ?? null,
    members: memberships.map<InternalRoomMember>((membership) => ({
      accountId: membership.accountId,
      displayName: membership.displayName,
      seat: membership.seat,
      controllerConnectionId: membership.controllerConnectionId,
      controllerEpoch: membership.controllerEpoch,
      connected: false,
    })),
  };
}

export function newRoomId(): string {
  return randomUUID();
}
