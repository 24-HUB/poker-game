import { Inject, Injectable } from '@nestjs/common';
import type { ClientSession, Db } from 'mongodb';

import { AuthorityLease, type AuthorityToken } from '../../authority/authorityLease';
import { MONGO_DB, TRANSACTION_RUNNER } from '../../database/database.tokens';
import { TransactionRunner } from '../../database/transactionRunner';
import type { SessionResult } from '@poker/contracts' with { 'resolution-mode': 'import' };

export type SessionParticipant = { accountId: string; displayName: string; seat: number };
export type StoredGameSession = {
  _id: string;
  roomId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABORTED';
  startedByAccountId: string;
  startCommandId: string;
  startPayloadHash: string;
  authorityBootId: string;
  authorityEpoch: number;
  participants: SessionParticipant[];
  stacks: number[];
  firstHandId: string;
  handNumber: number;
  buttonSeat: number;
  startedAt: Date;
  endingRequested: boolean;
  result?: SessionResult;
};

export class SessionError extends Error {
  public constructor(public readonly code: string, message: string) { super(message); }
}

type RoomDocument = {
  _id: string; status: 'OPEN' | 'CLOSED'; phase?: 'waiting' | 'playing'; sessionId?: string | null;
  revision: number; hostAccountId: string; authorityBootId: string; authorityEpoch: number;
};
type MembershipDocument = {
  roomId: string; accountId: string; displayName: string; seat: number | null;
  controllerConnectionId: string | null; controllerEpoch: number; leftAt: Date | null;
  pendingDeparture?: boolean;
};

export type StartSessionInput = {
  sessionId: string; firstHandId: string; roomId: string; accountId: string;
  connectionId: string; controlEpoch: number; commandId: string; payloadHash: string;
  startedAt: Date; authority: AuthorityToken;
};

@Injectable()
export class SessionRepository {
  public constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    private readonly authority: AuthorityLease,
  ) {}

  public async findByStart(accountId: string, commandId: string): Promise<StoredGameSession | null> {
    return this.db.collection<StoredGameSession>('gameSessions').findOne({ startedByAccountId: accountId, startCommandId: commandId });
  }

  public async findActive(roomId: string): Promise<StoredGameSession | null> {
    return this.db.collection<StoredGameSession>('gameSessions').findOne({ roomId, status: 'ACTIVE' });
  }

  public async start(input: StartSessionInput): Promise<StoredGameSession> {
    try {
      return await this.transactions.run(async (session) => this.startTransaction(input, session));
    } catch (error) {
      // A commit can succeed while its acknowledgement is lost. Resolve the durable identity.
      const committed = await this.findByStart(input.accountId, input.commandId);
      if (committed) {
        if (committed.startPayloadHash !== input.payloadHash) throw new SessionError('COMMAND_CONFLICT', 'Command ID reused.');
        return committed;
      }
      if (error instanceof Error && 'code' in error && error.code === 11_000) {
        throw new SessionError('ALREADY_IN_SESSION', 'A participant is already in an active session.');
      }
      throw error;
    }
  }

  private async startTransaction(input: StartSessionInput, session: ClientSession): Promise<StoredGameSession> {
    const existing = await this.db.collection<StoredGameSession>('gameSessions').findOne(
      { startedByAccountId: input.accountId, startCommandId: input.commandId }, { session },
    );
    if (existing) {
      if (existing.startPayloadHash !== input.payloadHash) throw new SessionError('COMMAND_CONFLICT', 'Command ID reused.');
      return existing;
    }
    await this.authority.fence(session, input.authority);
    const room = await this.db.collection<RoomDocument>('rooms').findOne({
      _id: input.roomId, status: 'OPEN', authorityBootId: input.authority.bootId,
      authorityEpoch: input.authority.epoch,
    }, { session });
    if (!room) throw new SessionError('ROOM_CLOSED', 'The room is no longer available.');
    if (room.phase === 'playing') throw new SessionError('SESSION_IN_PROGRESS', 'A session is already active.');
    if (room.hostAccountId !== input.accountId) throw new SessionError('FORBIDDEN', 'Only the host can start.');
    const members = await this.db.collection<MembershipDocument>('roomMemberships')
      .find({ roomId: input.roomId, leftAt: null, seat: { $ne: null } }, { session })
      .sort({ seat: 1 }).toArray();
    if (members.length < 2 || members.length > 6) throw new SessionError('NOT_ENOUGH_PLAYERS', 'Seat two to six players.');
    const host = members.find((member) => member.accountId === input.accountId);
    if (!host || host.controllerConnectionId !== input.connectionId || host.controllerEpoch !== input.controlEpoch) {
      throw new SessionError('NOT_CONTROLLER', 'This tab does not control the host account.');
    }
    const participants = members.map((member) => ({
      accountId: member.accountId, displayName: member.displayName, seat: member.seat!,
    }));
    const document: StoredGameSession = {
      _id: input.sessionId, roomId: input.roomId, status: 'ACTIVE',
      startedByAccountId: input.accountId, startCommandId: input.commandId,
      startPayloadHash: input.payloadHash, authorityBootId: input.authority.bootId,
      authorityEpoch: input.authority.epoch, participants, stacks: participants.map(() => 1_000),
      firstHandId: input.firstHandId, handNumber: 1, buttonSeat: participants[0]!.seat,
      startedAt: input.startedAt, endingRequested: false,
    };
    for (const participant of participants) {
      await this.db.collection<{ _id: string; accountId: string; roomId: string; sessionId: string; joinedAt: Date }>('activeParticipants').insertOne({
        _id: participant.accountId, accountId: participant.accountId, roomId: input.roomId,
        sessionId: input.sessionId, joinedAt: input.startedAt,
      }, { session });
    }
    await this.db.collection<StoredGameSession>('gameSessions').insertOne(document, { session });
    await this.db.collection<{ _id: string; sessionId: string; roomId: string; handNumber: number; status: string; revision: number; createdAt: Date }>('hands').insertOne({
      _id: input.firstHandId, sessionId: input.sessionId, roomId: input.roomId,
      handNumber: 1, status: 'PENDING', revision: 0, createdAt: input.startedAt,
    }, { session });
    const updated = await this.db.collection<RoomDocument>('rooms').updateOne({
      _id: input.roomId, status: 'OPEN', phase: { $ne: 'playing' }, revision: room.revision,
      authorityBootId: input.authority.bootId, authorityEpoch: input.authority.epoch,
    }, { $set: { phase: 'playing', sessionId: input.sessionId }, $inc: { revision: 1 } }, { session });
    if (updated.matchedCount !== 1) throw new SessionError('STALE_STATE', 'The room changed before the session started.');
    return document;
  }

  public async requestEnd(input: {
    sessionId: string; roomId: string; accountId: string; connectionId: string;
    controlEpoch: number; authority: AuthorityToken;
  }): Promise<void> {
    await this.transactions.run(async (session) => {
      await this.authority.fence(session, input.authority);
      const room = await this.db.collection<RoomDocument>('rooms').findOne({
        _id: input.roomId, status: 'OPEN', phase: 'playing', sessionId: input.sessionId,
        authorityBootId: input.authority.bootId, authorityEpoch: input.authority.epoch,
      }, { session });
      if (!room) throw new SessionError('SESSION_NOT_ACTIVE', 'The session is no longer active.');
      if (room.hostAccountId !== input.accountId) throw new SessionError('FORBIDDEN', 'Only the host can end the session.');
      const host = await this.db.collection<MembershipDocument>('roomMemberships').findOne({
        roomId: input.roomId, accountId: input.accountId, leftAt: null,
      }, { session });
      if (!host || host.controllerConnectionId !== input.connectionId || host.controllerEpoch !== input.controlEpoch) {
        throw new SessionError('NOT_CONTROLLER', 'This tab does not control the host account.');
      }
      const gameSession = await this.db.collection<StoredGameSession>('gameSessions').findOne(
        { _id: input.sessionId, status: 'ACTIVE' }, { session },
      );
      if (!gameSession) throw new SessionError('SESSION_NOT_ACTIVE', 'The session is no longer active.');
      if (gameSession.endingRequested) return;
      await this.db.collection<StoredGameSession>('gameSessions').updateOne(
        { _id: input.sessionId, status: 'ACTIVE' }, { $set: { endingRequested: true } }, { session },
      );
      await this.db.collection<RoomDocument>('rooms').updateOne(
        { _id: input.roomId, revision: room.revision }, { $inc: { revision: 1 } }, { session },
      );
    });
  }

  public async nextHand(input: { sessionId: string; roomId: string; previousHandNumber: number;
    handId: string; buttonSeat: number; createdAt: Date; authority: AuthorityToken }): Promise<void> {
    await this.transactions.run(async (session) => {
      await this.authority.fence(session, input.authority);
      const current = await this.db.collection<StoredGameSession>('gameSessions').findOne({
        _id: input.sessionId, roomId: input.roomId, status: 'ACTIVE', endingRequested: false,
        handNumber: input.previousHandNumber,
      }, { session });
      if (!current) throw new SessionError('SESSION_NOT_ACTIVE', 'The session cannot advance.');
      const previous = await this.db.collection<{ _id: string; sessionId: string; handNumber: number; status: string }>('hands').findOne({
        sessionId: input.sessionId, handNumber: input.previousHandNumber, status: 'COMPLETED',
      }, { session });
      if (!previous) throw new SessionError('HAND_SETTLING', 'The previous hand has not committed.');
      await this.db.collection<{ _id: string; sessionId: string; roomId: string; handNumber: number; status: string; revision: number; createdAt: Date }>('hands').insertOne({
        _id: input.handId, sessionId: input.sessionId, roomId: input.roomId,
        handNumber: input.previousHandNumber + 1, status: 'PENDING', revision: 0, createdAt: input.createdAt,
      }, { session });
      const updated = await this.db.collection<StoredGameSession>('gameSessions').updateOne({
        _id: input.sessionId, status: 'ACTIVE', endingRequested: false, handNumber: input.previousHandNumber,
      }, { $set: { handNumber: input.previousHandNumber + 1, buttonSeat: input.buttonSeat } }, { session });
      if (updated.matchedCount !== 1) throw new SessionError('STALE_STATE', 'The session changed before the next hand.');
    });
  }

  public async complete(input: { sessionId: string; roomId: string; result: SessionResult;
    authority: AuthorityToken }): Promise<void> {
    await this.transactions.run(async (session) => {
      await this.authority.fence(session, input.authority);
      const game = await this.db.collection<StoredGameSession>('gameSessions').findOne({
        _id: input.sessionId, roomId: input.roomId, status: 'ACTIVE',
      }, { session });
      if (!game) throw new SessionError('SESSION_NOT_ACTIVE', 'The session is no longer active.');
      const hand = await this.db.collection<{ _id: string; sessionId: string; handNumber: number; status: string }>('hands').findOne({
        sessionId: input.sessionId, handNumber: game.handNumber, status: 'COMPLETED',
      }, { session });
      if (!hand) throw new SessionError('HAND_SETTLING', 'The hand has not committed.');
      const room = await this.db.collection<RoomDocument>('rooms').findOne({
        _id: input.roomId, status: 'OPEN', phase: 'playing', sessionId: input.sessionId,
      }, { session });
      if (!room) throw new SessionError('ROOM_CLOSED', 'The room is no longer active.');
      const updated = await this.db.collection<StoredGameSession>('gameSessions').updateOne({
        _id: input.sessionId, status: 'ACTIVE', handNumber: game.handNumber,
      }, { $set: { status: 'COMPLETED', result: input.result } }, { session });
      if (updated.matchedCount !== 1) throw new SessionError('STALE_STATE', 'The session changed before completion.');
      await this.db.collection('activeParticipants').deleteMany({ sessionId: input.sessionId }, { session });
      const departing = await this.db.collection<MembershipDocument>('roomMemberships').find({
        roomId: input.roomId, pendingDeparture: true,
      }, { session }).toArray();
      for (const member of departing) {
        await this.db.collection<{ _id: string; roomId: string }>('activeRoomMemberships').deleteOne({ _id: member.accountId, roomId: input.roomId }, { session });
        await this.db.collection('roomMemberships').updateOne({ roomId: input.roomId, accountId: member.accountId },
          { $set: { leftAt: new Date(input.result.endedAt), seat: null, pendingDeparture: false } }, { session });
      }
      const roomUpdated = await this.db.collection<RoomDocument>('rooms').updateOne({
        _id: input.roomId, revision: room.revision, sessionId: input.sessionId,
      }, { $set: { phase: 'waiting', sessionId: null }, $inc: { revision: 1 } }, { session });
      if (roomUpdated.matchedCount !== 1) throw new SessionError('STALE_STATE', 'The room changed before completion.');
    });
  }
}
