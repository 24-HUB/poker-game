import { createHash } from 'node:crypto';

import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import type { CommandOutcome, GameCommand, GameReply, Result } from '@poker/contracts' with { 'resolution-mode': 'import' };
import { applyAction, assertDeck, legalActions, startHand } from '@poker/poker-engine';

import { AuthorityLease } from '../../authority/authorityLease';
import { DECK_FACTORY, type DeckFactory } from '../../infrastructure/deckFactory';
import { GAME_CLOCK, type CancelTimer, type GameClock } from '../../infrastructure/gameClock';
import { IdentityService } from '../identity/identity.service';
import { projectGame } from '../../projections/gameProjection';
import { GameCommandCache } from './gameCommandCache';
import type { RoomContext } from './room.service';
import { RoomRepository } from './room.repository';
import { RoomQueueFullError, RoomRegistry } from './roomRegistry';
import { SessionError } from './session.repository';
import { SessionService, type SessionRuntime } from './session.service';

export type GameContext = RoomContext & { headers: Headers };
type TimerIdentity = { sessionId: string; handId: string; gameVersion: number; actor: string; deadline: number };

function fail(code: string, message: string): Result<GameReply> {
  return { data: null, error: { code, message } };
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
export class GameService implements OnApplicationShutdown {
  private readonly timers = new Map<string, CancelTimer>();
  private disposed = false;

  public constructor(
    private readonly rooms: RoomRepository,
    private readonly sessions: SessionService,
    private readonly registry: RoomRegistry,
    private readonly authority: AuthorityLease,
    private readonly identity: IdentityService,
    @Inject(GAME_CLOCK) private readonly clock: GameClock,
    @Inject(DECK_FACTORY) private readonly decks: DeckFactory,
    private readonly cache: GameCommandCache,
  ) {}

  public async execute(context: GameContext, command: GameCommand): Promise<Result<GameReply>> {
    if (this.disposed) return fail('SERVICE_UNAVAILABLE', 'The game is shutting down.');
    try {
      return await this.registry.enqueue(command.roomId, () => this.executeInQueue(context, command));
    } catch (error) {
      if (error instanceof RoomQueueFullError) return fail('SERVER_BUSY', 'The room command queue is full.');
      if (error instanceof SessionError) return fail(error.code, error.message);
      throw error;
    }
  }

  private async executeInQueue(context: GameContext, command: GameCommand): Promise<Result<GameReply>> {
    let verified;
    try { verified = await this.identity.resolve(context.headers); }
    catch { return fail('SERVICE_UNAVAILABLE', 'Session verification is unavailable.'); }
    if (!verified || verified.accountId !== context.identity.accountId || verified.sessionId !== context.identity.sessionId) {
      return fail('UNAUTHENTICATED', 'A valid session is required.');
    }
    const token = this.authority.currentToken();
    if (!token) {
      this.cancelTurn(command.roomId);
      return fail('SERVICE_UNAVAILABLE', 'Game authority is unavailable.');
    }
    if (command.type !== 'game:sync') {
      if (command.authorityBootId !== token.bootId) return fail('ROOM_CLOSED', 'The room belongs to an earlier process.');
      const issuedAt = Date.parse(command.issuedAt);
      if (!Number.isFinite(issuedAt) || issuedAt > this.clock.now() + 60_000 || issuedAt < this.clock.now() - 86_400_000) {
        return fail('COMMAND_EXPIRED', 'The command is outside its replay window.');
      }
    }
    const room = await this.rooms.load(command.roomId);
    if (!room) return fail('ROOM_CLOSED', 'The room is no longer available.');
    const member = room.members.find((candidate) => candidate.accountId === verified.accountId);
    if (!member) return fail('FORBIDDEN', 'Only room members can access the game.');
    const controller = this.registry.controller(command.roomId);
    if (command.type === 'session:start') {
      const runtime = await this.sessions.startInQueue({ identity: verified, connectionId: context.connectionId }, command);
      if (!runtime.hand) this.dealFirstHand(runtime);
      return this.reply(runtime, command.roomId, verified.accountId, context.connectionId,
        { commandId: command.commandId, sessionId: runtime.sessionId,
          handId: runtime.firstHandId, acceptedGameVersion: 0 });
    }
    const runtime = controller.session;
    if (!runtime || runtime.sessionId !== room.sessionId) {
      return command.type === 'game:sync'
        ? { data: { game: null, outcome: null }, error: null }
        : fail('SESSION_NOT_ACTIVE', 'No active session is available.');
    }
    if (command.type === 'game:sync') return this.reply(runtime, command.roomId, verified.accountId, context.connectionId, null);
    if (member.controllerConnectionId !== context.connectionId || member.controllerEpoch !== command.controlEpoch) {
      return fail('NOT_CONTROLLER', 'This tab does not control the player.');
    }
    if (command.type === 'session:end') {
      await this.sessions.requestEndInQueue({ identity: verified, connectionId: context.connectionId }, command);
      runtime.snapshotRevision += 1;
      return this.reply(runtime, command.roomId, verified.accountId, context.connectionId,
        { commandId: command.commandId, sessionId: runtime.sessionId, handId: runtime.handId, acceptedGameVersion: runtime.gameVersion });
    }
    if (command.sessionId !== runtime.sessionId) {
      return fail('STALE_STATE', 'This action belongs to an earlier hand.');
    }
    const payloadHash = hash(command);
    const cached = this.cache.lookup(verified.accountId, command.commandId, payloadHash,
      runtime.handId, runtime.previousHandId, this.clock.now());
    if (cached.kind === 'conflict') return fail('COMMAND_CONFLICT', 'Command ID reused with another action.');
    if (cached.kind === 'stale') return fail('STALE_STATE', 'This action belongs to an older hand.');
    if (cached.kind === 'full') return fail('RATE_LIMITED', 'Too many retryable game commands are open.');
    if (cached.kind === 'hit') return this.reply(runtime, command.roomId, verified.accountId, context.connectionId, cached.outcome);
    if (command.handId !== runtime.handId) return fail('STALE_STATE', 'This action belongs to an earlier hand.');
    if (!runtime.hand || runtime.hand.street === 'complete') return fail('HAND_SETTLING', 'The hand is settling.');
    if (runtime.deadline !== null && this.clock.now() >= runtime.deadline) {
      this.applyTimeout(runtime);
      return fail('STALE_STATE', 'The turn deadline has passed.');
    }
    if (command.expectedGameVersion !== runtime.gameVersion) return fail('STALE_STATE', 'The game state changed.');
    if (runtime.hand.actorAccountId !== verified.accountId) return fail('NOT_YOUR_TURN', 'Another player is acting.');
    let transition;
    try { transition = applyAction(runtime.hand, verified.accountId, command.action, 'manual'); }
    catch (error) {
      if (error instanceof RangeError) return fail('ILLEGAL_ACTION', 'This action is not legal.');
      throw error;
    }
    this.accept(runtime, transition);
    const outcome = { commandId: command.commandId, sessionId: runtime.sessionId,
      handId: runtime.handId, acceptedGameVersion: runtime.gameVersion };
    this.cache.store(verified.accountId, command.commandId, payloadHash, outcome,
      Date.parse(command.issuedAt) + 86_400_000);
    return this.reply(runtime, command.roomId, verified.accountId, context.connectionId, outcome);
  }

  private dealFirstHand(runtime: SessionRuntime): void {
    const deck = this.decks.shuffle();
    assertDeck(deck);
    const transition = startHand({
      seats: runtime.participants.map((participant, index) => ({
        accountId: participant.accountId, seat: participant.seat, startingStack: runtime.stacks[index]!,
      })),
      buttonSeat: runtime.buttonSeat, smallBlind: runtime.smallBlind, bigBlind: runtime.bigBlind, deck,
    });
    runtime.hand = transition.state;
    runtime.gameVersion = transition.state.version;
    runtime.snapshotRevision += 1;
    runtime.settlement = transition.settlement;
    this.scheduleTurn(runtime);
  }

  private accept(runtime: SessionRuntime, transition: ReturnType<typeof applyAction>): void {
    runtime.hand = transition.state;
    runtime.gameVersion = transition.state.version;
    runtime.snapshotRevision += 1;
    runtime.settlement = transition.settlement;
    this.scheduleTurn(runtime);
  }

  private applyTimeout(runtime: SessionRuntime): void {
    const actor = runtime.hand?.actorAccountId;
    if (!actor || !runtime.hand) return;
    const legal = legalActions(runtime.hand, actor);
    this.accept(runtime, applyAction(runtime.hand, actor,
      legal.canCheck ? { type: 'check' } : { type: 'fold' }, 'timeout'));
  }

  private scheduleTurn(runtime: SessionRuntime): void {
    this.cancelTurn(runtime.roomId);
    const actor = runtime.hand?.actorAccountId;
    if (!actor || !runtime.hand || this.disposed) { runtime.deadline = null; return; }
    const deadline = this.clock.now() + 30_000;
    runtime.deadline = deadline;
    const identity: TimerIdentity = {
      sessionId: runtime.sessionId, handId: runtime.handId,
      gameVersion: runtime.gameVersion, actor, deadline,
    };
    const cancel = this.clock.schedule(deadline, () => {
      void this.registry.enqueue(runtime.roomId, async () => {
        if (this.disposed) return;
        if (!this.authority.currentToken()) {
          this.cancelTurn(runtime.roomId);
          return;
        }
        const current = this.registry.controller(runtime.roomId).session;
        if (!current || current.sessionId !== identity.sessionId || current.handId !== identity.handId ||
            current.gameVersion !== identity.gameVersion || current.hand?.actorAccountId !== identity.actor ||
            current.deadline !== identity.deadline || this.clock.now() < identity.deadline) return;
        this.applyTimeout(current);
      }).catch(() => undefined);
    });
    this.timers.set(runtime.roomId, cancel);
  }

  private async reply(runtime: SessionRuntime, roomId: string, accountId: string,
    connectionId: string, outcome: CommandOutcome | null): Promise<Result<GameReply>> {
    const room = await this.rooms.load(roomId);
    if (!room || !room.members.some((member) => member.accountId === accountId)) {
      return fail('FORBIDDEN', 'Only room members can access the game.');
    }
    return { data: { game: projectGame(runtime, room, this.registry.controller(roomId),
      accountId, connectionId, this.clock.now()), outcome }, error: null };
  }

  public dispose(): void {
    this.disposed = true;
    for (const roomId of this.timers.keys()) this.cancelTurn(roomId);
  }

  private cancelTurn(roomId: string): void {
    this.timers.get(roomId)?.();
    this.timers.delete(roomId);
    const runtime = this.registry.controller(roomId).session;
    if (runtime) runtime.deadline = null;
  }

  public onApplicationShutdown(): void { this.dispose(); }
}
