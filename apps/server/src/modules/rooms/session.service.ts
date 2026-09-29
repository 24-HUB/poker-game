import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { CommittedHandResult, GameCommand, SessionResult } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { EngineSettlement, HandState } from '@poker/poker-engine' with { 'resolution-mode': 'import' };

import { AuthorityLease } from '../../authority/authorityLease';
import type { RoomContext } from './room.service';
import { RoomRegistry } from './roomRegistry';
import { SessionError, SessionRepository, type SessionParticipant, type StoredGameSession } from './session.repository';

export type SessionRuntime = {
  sessionId: string;
  roomId: string;
  firstHandId: string;
  handNumber: number;
  participants: SessionParticipant[];
  stacks: number[];
  buttonSeat: number;
  smallBlind: number;
  bigBlind: number;
  ending: boolean;
  hand: HandState | null;
  handId: string;
  gameVersion: number;
  snapshotRevision: number;
  deadline: number | null;
  settlement: EngineSettlement | null;
  previousHandId: string | null;
  committedHandResult: CommittedHandResult | null;
  sessionResult: SessionResult | null;
  paused: boolean;
};

function runtime(document: StoredGameSession): SessionRuntime {
  return {
    sessionId: document._id, roomId: document.roomId, firstHandId: document.firstHandId,
    handNumber: document.handNumber, participants: document.participants, stacks: document.stacks,
    buttonSeat: document.buttonSeat, smallBlind: 10, bigBlind: 20,
    ending: document.endingRequested, hand: null, handId: document.firstHandId,
    gameVersion: 0, snapshotRevision: 0, deadline: null, settlement: null, previousHandId: null,
    committedHandResult: null, sessionResult: document.result ?? null, paused: false,
  };
}

function hash(command: GameCommand): string {
  const canonical = (value: unknown): string => Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`
      : JSON.stringify(value);
  return createHash('sha256').update(canonical(command)).digest('hex');
}

@Injectable()
export class SessionService {
  public constructor(
    private readonly repository: SessionRepository,
    private readonly registry: RoomRegistry,
    private readonly authority: AuthorityLease,
  ) {}

  public async startInQueue(context: RoomContext, command: Extract<GameCommand, { type: 'session:start' }>): Promise<SessionRuntime> {
    const authority = this.authority.currentToken();
    if (!authority) throw new SessionError('SERVICE_UNAVAILABLE', 'Room authority is unavailable.');
    if (command.authorityBootId !== authority.bootId) throw new SessionError('ROOM_CLOSED', 'The room belongs to an earlier process.');
    const issuedAt = Date.parse(command.issuedAt);
    if (issuedAt > Date.now() + 60_000 || issuedAt < Date.now() - 86_400_000) {
      throw new SessionError('COMMAND_EXPIRED', 'The command is outside its replay window.');
    }
    const document = await this.repository.start({
      sessionId: randomUUID(), firstHandId: randomUUID(), roomId: command.roomId,
      accountId: context.identity.accountId, connectionId: context.connectionId,
      controlEpoch: command.controlEpoch, commandId: command.commandId, payloadHash: hash(command),
      startedAt: new Date(), authority,
    });
    const controller = this.registry.controller(command.roomId);
    if (controller.session?.sessionId === document._id) return controller.session;
    controller.session = runtime(document);
    return controller.session;
  }

  public async requestEndInQueue(context: RoomContext, command: Extract<GameCommand, { type: 'session:end' }>): Promise<void> {
    const authority = this.authority.currentToken();
    if (!authority) throw new SessionError('SERVICE_UNAVAILABLE', 'Room authority is unavailable.');
    if (command.authorityBootId !== authority.bootId) throw new SessionError('ROOM_CLOSED', 'The room belongs to an earlier process.');
    await this.repository.requestEnd({
      sessionId: command.sessionId, roomId: command.roomId, accountId: context.identity.accountId,
      connectionId: context.connectionId, controlEpoch: command.controlEpoch, authority,
    });
    const controller = this.registry.controller(command.roomId);
    if (controller.session?.sessionId === command.sessionId) controller.session.ending = true;
  }

  public async nextHandInQueue(runtime: SessionRuntime, handId: string, buttonSeat: number, createdAt: Date): Promise<void> {
    const authority = this.authority.currentToken();
    if (!authority) throw new SessionError('SERVICE_UNAVAILABLE', 'Room authority is unavailable.');
    await this.repository.nextHand({ sessionId: runtime.sessionId, roomId: runtime.roomId,
      previousHandNumber: runtime.handNumber, handId, buttonSeat, createdAt, authority });
    runtime.previousHandId = runtime.handId;
    runtime.handId = handId;
    runtime.handNumber += 1;
    runtime.buttonSeat = buttonSeat;
  }

  public async completeInQueue(runtime: SessionRuntime, reason: SessionResult['reason'], endedAt: Date): Promise<void> {
    const authority = this.authority.currentToken();
    if (!authority) throw new SessionError('SERVICE_UNAVAILABLE', 'Room authority is unavailable.');
    const standings = runtime.participants.map((participant, index) => ({
      accountId: participant.accountId, seat: participant.seat, stack: runtime.stacks[index]!,
    }));
    const highest = Math.max(...runtime.stacks);
    const result: SessionResult = { sessionId: runtime.sessionId, roomId: runtime.roomId,
      endedAt: endedAt.toISOString(), reason, standings,
      leaderAccountIds: standings.filter((entry) => entry.stack === highest).map((entry) => entry.accountId) };
    await this.repository.complete({ sessionId: runtime.sessionId, roomId: runtime.roomId, result, authority });
    runtime.sessionResult = result;
    runtime.snapshotRevision += 1;
  }
}
