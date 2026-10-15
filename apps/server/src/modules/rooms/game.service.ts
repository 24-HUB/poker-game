import { createHash, randomUUID } from 'node:crypto';

import { ForbiddenException, Inject, Injectable, Optional, Logger, ServiceUnavailableException, type OnApplicationShutdown } from '@nestjs/common';
import type { CommandOutcome, GameCommand, GameReply, HandHistoryPage, Result } from '@poker/contracts' with { 'resolution-mode': 'import' };
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
import { SettlementService, type SettlementCandidate } from '../settlement/settlement.service';
import { BOT_RANDOM, CryptoBotRandom, type BotRandom } from './bots/botRandom';
import { buildBotObservation } from './bots/botObservation';
import { chooseBotAction } from './bots/botStrategy';
import { BotTurnScheduler, type TurnPlan, type ScheduledTurn } from './bots/botTurnScheduler';
import { sessionEndReason } from './sessionEndReason';

export type GameContext = RoomContext & { headers: Headers };

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
  private readonly turns: BotTurnScheduler;
  private readonly pausedTurns = new Map<string, TurnPlan>();
  private readonly pausedResults = new Map<string, number>();
  private readonly resultGenerations = new Map<string, number>();
  private readonly resultTransitions = new Map<string, number>();
  private resultGeneration = 0;
  private presenceVerifier: ((roomId: string) => Promise<boolean>) | null = null;
  private readonly logger = new Logger(GameService.name);
  private readonly resultTimers = new Map<string, CancelTimer>();
  private readonly candidates = new Map<string, SettlementCandidate>();
  private rewardListener: ((accountIds: string[]) => void) | null = null;
  private updateListener: ((roomId: string) => void) | null = null;
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
    private readonly settlements: SettlementService,
    @Optional() @Inject(BOT_RANDOM) private readonly random: BotRandom = new CryptoBotRandom(),
  ) {
    this.turns = new BotTurnScheduler(clock);
    registry.subscribeGameLifecycle({ presence: (roomId) => this.reconcilePresenceInQueue(roomId), close: (roomId) => this.cancelRoomInQueue(roomId) });
  }

  public subscribePresenceVerifier(verifier: (roomId: string) => Promise<boolean>): void { this.presenceVerifier = verifier; }

  private async reconcilePresenceInQueue(roomId: string, verifiedPresence?: boolean): Promise<void> {
    const controller = this.registry.peek(roomId);
    const runtime = controller?.session;
    if (!runtime || runtime.mode !== 'practice' || runtime.sessionResult) return;
    const present = verifiedPresence ?? runtime.participants.some((player) => player.kind !== 'bot' && controller!.isConnected(player.accountId));
    if (!present && !runtime.presencePaused) {
      runtime.presencePaused = true;
      const turn = this.turns.pause(roomId);
      if (turn) this.pausedTurns.set(roomId, turn);
      runtime.deadline = null;
      const transitionAt = this.resultTransitions.get(roomId);
      if (transitionAt != null) {
        this.pausedResults.set(roomId, Math.max(0, transitionAt - this.clock.now()));
        this.cancelResult(roomId);
        runtime.nextTransitionAt = null;
      }
      runtime.snapshotRevision += 1;
    } else if (present && runtime.presencePaused) {
      runtime.presencePaused = false;
      const turn = this.pausedTurns.get(roomId);
      this.pausedTurns.delete(roomId);
      if (turn && runtime.hand?.street !== 'complete') this.scheduleTurn(runtime, turn);
      const resultMs = this.pausedResults.get(roomId);
      this.pausedResults.delete(roomId);
      if (resultMs !== undefined && runtime.committedHandResult?.handId === runtime.handId) this.scheduleResult(runtime, resultMs);
      runtime.snapshotRevision += 1;
    }
  }

  private async canProgress(runtime: SessionRuntime): Promise<boolean> {
    if (runtime.mode !== 'practice') return true;
    const present = this.presenceVerifier ? await this.presenceVerifier(runtime.roomId)
      : runtime.participants.some((player) => player.kind !== 'bot' && this.registry.peek(runtime.roomId)?.isConnected(player.accountId));
    await this.reconcilePresenceInQueue(runtime.roomId, present);
    return !runtime.presencePaused;
  }

  private cancelRoomInQueue(roomId: string): void {
    this.turns.cancel(roomId); this.cancelResult(roomId);
    this.pausedTurns.delete(roomId); this.pausedResults.delete(roomId);
    const runtime = this.registry.peek(roomId)?.session;
    if (runtime) this.candidates.delete(runtime.handId);
  }

  public subscribeUpdates(listener: (roomId: string) => void): void { this.updateListener = listener; }
  public subscribeRewards(listener: (accountIds: string[]) => void): void { this.rewardListener = listener; }

  public async history(accountId: string, roomId: string, sessionId: string, beforeHandNumber?: number): Promise<HandHistoryPage> {
    const token = this.authority.currentToken();
    if (!token) throw new ServiceUnavailableException('Game authority is unavailable.');
    try {
      return await this.registry.enqueue(roomId, async () => {
        const current = await this.rooms.currentRoom(accountId, token);
        if (!current || current.roomId !== roomId) throw new ForbiddenException('Only current room members can read hand history.');
        const page = await this.sessions.history(accountId, roomId, sessionId, beforeHandNumber);
        const authority = this.authority.currentToken();
        if (!authority || authority.bootId !== token.bootId || authority.epoch !== token.epoch) throw new Error('Authority changed');
        return { ...page, hands: page.hands.map((result) => ({
          mode: result.mode ?? 'standard', handId: result.handId, sessionId: result.sessionId, handNumber: result.handNumber,
          completedAt: result.completedAt, completedDateUtc: result.completedDateUtc, rulesVersion: result.rulesVersion,
          contributions: result.contributions, payouts: result.payouts, finalStacks: result.finalStacks,
          manualActionAccountIds: result.manualActionAccountIds, winners: result.winners, revealedCards: result.revealedCards,
          ...(result.presentation ? { presentation: result.presentation } : {}),
          ...(result.rewardReceipts ? { rewardReceipts: result.rewardReceipts.filter((receipt) => receipt.accountId === accountId).map((receipt) => ({
            handId: receipt.handId, accountId: receipt.accountId, policyVersion: receipt.policyVersion,
            completedDateUtc: receipt.completedDateUtc, qualified: receipt.qualified, reason: receipt.reason,
            requestedParticipation: receipt.requestedParticipation, requestedBonus: receipt.requestedBonus,
            grantedParticipation: receipt.grantedParticipation, grantedBonus: receipt.grantedBonus,
          })) } : {}),
        })) };
      });
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof SessionError && error.code === 'FORBIDDEN') throw new ForbiddenException(error.message);
      throw new ServiceUnavailableException('Completed hands could not be loaded. Try again shortly.');
    }
  }

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
      const active = controller.session;
      if (active?.sessionId === runtime.sessionId && !active.hand) await this.dealFirstHand(active);
      return this.reply(active ?? runtime, command.roomId, verified.accountId, context.connectionId,
        { commandId: command.commandId, sessionId: runtime.sessionId,
          handId: runtime.firstHandId, acceptedGameVersion: 0 });
    }
    const runtime = controller.session;
    if (!runtime || (runtime.sessionId !== room.sessionId && !runtime.sessionResult)) {
      return command.type === 'game:sync'
        ? { data: { game: null, outcome: null }, error: null }
        : fail('SESSION_NOT_ACTIVE', 'No active session is available.');
    }
    if (command.type === 'game:sync') return this.reply(runtime, command.roomId, verified.accountId, context.connectionId, null);
    if (runtime.sessionResult) return fail('SESSION_NOT_ACTIVE', 'The session has ended.');
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
    if (runtime.presencePaused) return fail('HAND_SETTLING', 'Practice play is paused until a human reconnects.');
    if (runtime.deadline !== null && this.clock.now() >= runtime.deadline) {
      await this.applyTimeout(runtime);
      this.updateListener?.(runtime.roomId);
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
    await this.accept(runtime, transition);
    const outcome = { commandId: command.commandId, sessionId: runtime.sessionId,
      handId: runtime.handId, acceptedGameVersion: runtime.gameVersion };
    this.cache.store(verified.accountId, command.commandId, payloadHash, outcome,
      Date.parse(command.issuedAt) + 86_400_000);
    return this.reply(runtime, command.roomId, verified.accountId, context.connectionId, outcome);
  }

  private async dealFirstHand(runtime: SessionRuntime): Promise<void> {
    const deck = this.decks.shuffle();
    assertDeck(deck);
    const transition = startHand({
      seats: runtime.participants.flatMap((participant, index) => runtime.stacks[index]! > 0 ? [{
        accountId: participant.accountId, seat: participant.seat, startingStack: runtime.stacks[index]!,
      }] : []),
      buttonSeat: runtime.buttonSeat, smallBlind: runtime.smallBlind, bigBlind: runtime.bigBlind, deck,
    });
    runtime.hand = transition.state;
    runtime.gameVersion = transition.state.version;
    runtime.snapshotRevision += 1;
    runtime.settlement = transition.settlement;
    this.scheduleTurn(runtime);
    if (transition.settlement) await this.commitSettlement(runtime);
  }

  private async accept(runtime: SessionRuntime, transition: ReturnType<typeof applyAction>): Promise<void> {
    runtime.hand = transition.state;
    runtime.gameVersion = transition.state.version;
    runtime.snapshotRevision += 1;
    runtime.settlement = transition.settlement;
    this.scheduleTurn(runtime);
    if (transition.settlement) await this.commitSettlement(runtime);
  }

  private async applyTimeout(runtime: SessionRuntime): Promise<void> {
    const actor = runtime.hand?.actorAccountId;
    if (!actor || !runtime.hand) return;
    const legal = legalActions(runtime.hand, actor);
    await this.accept(runtime, applyAction(runtime.hand, actor,
      legal.canCheck ? { type: 'check' } : { type: 'fold' }, 'timeout'));
  }

  private scheduleTurn(runtime: SessionRuntime, restored?: TurnPlan): void {
    this.cancelTurn(runtime.roomId);
    const actor = runtime.hand?.actorAccountId;
    const token = this.authority.currentToken();
    if (!actor || !runtime.hand || this.disposed || runtime.presencePaused || runtime.paused || !token) { runtime.deadline = null; return; }
    const bot = runtime.participants.find((player) => player.accountId === actor)?.kind === 'bot';
    let action = restored?.action ?? null;
    if (bot && !restored) {
      try { action = chooseBotAction(buildBotObservation(runtime.hand, actor), this.random.next()); }
      catch { this.logger.warn('Bot strategy failed; using legal fallback.');
        action = legalActions(runtime.hand, actor).canCheck ? { type: 'check' } : { type: 'fold' }; }
    }
    const plan: TurnPlan = restored ?? { sessionId: runtime.sessionId, handId: runtime.handId,
      gameVersion: runtime.gameVersion, actor, bootId: token.bootId, epoch: token.epoch, action,
      safetyMs: 30_000, botMs: bot ? 1000 + Math.floor(this.random.next() * 2001) : null };
    runtime.deadline = this.clock.now() + plan.safetyMs;
    this.turns.arm(runtime.roomId, plan, (identity: ScheduledTurn, botDue: boolean) => {
      if (this.disposed || !this.turns.isCurrent(runtime.roomId, identity)) return;
      void this.registry.enqueue(runtime.roomId, async () => {
        if (this.disposed || !this.turns.isCurrent(runtime.roomId, identity)) return;
        const authority = this.authority.currentToken();
        if (!authority || authority.bootId !== identity.bootId || authority.epoch !== identity.epoch) {
          this.cancelTurn(runtime.roomId);
          return;
        }
        const current = this.registry.peek(runtime.roomId)?.session;
        const dueAt = botDue ? identity.botAt : identity.safetyAt;
        if (!current || current.sessionId !== identity.sessionId || current.handId !== identity.handId ||
            current.gameVersion !== identity.gameVersion || current.hand?.actorAccountId !== identity.actor ||
            current.presencePaused || current.paused || current.sessionResult || dueAt === null || this.clock.now() < dueAt) return;
        const room = await this.rooms.load(runtime.roomId);
        if (!room || room.phase !== 'playing' || room.authorityBootId !== identity.bootId || room.authorityEpoch !== identity.epoch) { this.cancelTurn(runtime.roomId); return; }
        if (!await this.canProgress(current)) return;
        if (botDue) {
          if (!identity.action || current.participants.find((player) => player.accountId === identity.actor)?.kind !== 'bot') return;
          let transition;
          try { transition = applyAction(current.hand!, identity.actor, identity.action, 'bot'); }
          catch (error) {
            if (!(error instanceof RangeError)) throw error;
            this.logger.warn('Bot action rejected; using legal fallback.');
            const legal = legalActions(current.hand!, identity.actor);
            transition = applyAction(current.hand!, identity.actor, legal.canCheck ? { type: 'check' } : { type: 'fold' }, 'bot');
          }
          await this.accept(current, transition);
        } else await this.applyTimeout(current);
        this.updateListener?.(current.roomId);
      }).catch(() => this.turns.retry(runtime.roomId, identity, botDue));
    });
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
    this.turns.dispose();
    for (const cancel of this.resultTimers.values()) cancel();
    this.resultTimers.clear();
    this.resultGenerations.clear(); this.resultTransitions.clear(); this.pausedTurns.clear(); this.pausedResults.clear();
  }

  private cancelTurn(roomId: string): void {
    this.turns.cancel(roomId);
    const runtime = this.registry.peek(roomId)?.session;
    if (runtime) runtime.deadline = null;
  }

  public onApplicationShutdown(): void { this.dispose(); }

  private cancelResult(roomId: string): void {
    this.resultTimers.get(roomId)?.(); this.resultTimers.delete(roomId); this.resultGenerations.delete(roomId); this.resultTransitions.delete(roomId);
  }

  private async commitSettlement(runtime: SessionRuntime): Promise<void> {
    const engine = runtime.settlement;
    if (!engine) return;
    let candidate = this.candidates.get(runtime.handId);
    if (!candidate) {
      const authority = this.authority.currentToken();
      if (!authority) { runtime.paused = true; return; }
      const completedAt = new Date(this.clock.now());
      candidate = { mode: runtime.mode ?? 'standard', roomId: runtime.roomId, sessionId: runtime.sessionId, handId: runtime.handId,
        handNumber: runtime.handNumber, authority, expectedRevision: 0, rulesVersion: 1,
        completedAt, completedDateUtc: completedAt.toISOString().slice(0, 10),
        rewardPolicyVersion: runtime.rewardPolicyVersion,
        dealtInAccountIds: runtime.hand?.seats.map((seat) => seat.accountId) ?? [],
        participants: runtime.participants,
        presentationParticipants: runtime.participants.map((player) => ({ ...player,
          folded: runtime.hand?.seats.find((seat) => seat.accountId === player.accountId)?.folded ?? false,
          equipment: runtime.equipmentByAccount?.[player.accountId] ?? { avatar: null, cardBack: null },
        })),
        engine: { ...engine, finalStacks: runtime.participants.map((participant) => {
          const seatIndex = runtime.hand?.seats.findIndex((seat) => seat.accountId === participant.accountId) ?? -1;
          return seatIndex < 0 ? runtime.stacks[runtime.participants.indexOf(participant)]! : engine.finalStacks[seatIndex]!;
        }) },
      };
      this.candidates.set(runtime.handId, candidate);
    }
    try {
      const result = await this.settlements.commit(candidate);
      runtime.committedHandResult = result;
      if (result.rewardReceipts?.length) this.rewardListener?.(result.rewardReceipts.map((receipt) => receipt.accountId));
      runtime.stacks = result.finalStacks.map((entry) => entry.amount);
      runtime.paused = false;
      runtime.snapshotRevision += 1;
      this.candidates.delete(runtime.handId);
      this.scheduleResult(runtime, 5_000);
    } catch {
      runtime.paused = true;
      runtime.snapshotRevision += 1;
      this.scheduleResult(runtime, 1_000, true);
    }
  }

  private scheduleResult(runtime: SessionRuntime, delay: number, retry = false): void {
    this.cancelResult(runtime.roomId);
    if (runtime.presencePaused && !retry) {
      this.pausedResults.set(runtime.roomId, delay); runtime.nextTransitionAt = null; return;
    }
    const handId = runtime.handId;
    const authority = this.authority.currentToken();
    if (!authority || this.disposed) return;
    const generation = ++this.resultGeneration;
    this.resultGenerations.set(runtime.roomId, generation);
    const at = this.clock.now() + delay;
    if (!retry) this.resultTransitions.set(runtime.roomId, at);
    runtime.nextTransitionAt = retry || runtime.paused ? null : at;
    this.resultTimers.set(runtime.roomId, this.clock.schedule(at, () => {
      void this.registry.enqueue(runtime.roomId, async () => {
        const token = this.authority.currentToken();
        if (this.disposed || !token || token.bootId !== authority.bootId || token.epoch !== authority.epoch ||
            this.resultGenerations.get(runtime.roomId) !== generation || this.clock.now() < at) return;
        const current = this.registry.peek(runtime.roomId)?.session;
        if (!current || current.sessionId !== runtime.sessionId || current.handId !== handId || current.sessionResult) return;
        try {
          if (retry) await this.commitSettlement(current);
          else if (await this.canProgress(current)) await this.afterResult(current);
          this.updateListener?.(current.roomId);
        } catch {
          current.paused = true;
          current.snapshotRevision += 1;
          this.scheduleResult(current, 1_000, retry);
          this.updateListener?.(current.roomId);
        }
      }).catch(() => undefined);
    }));
  }

  private async afterResult(runtime: SessionRuntime): Promise<void> {
    if (!runtime.committedHandResult || runtime.presencePaused) return;
    const reason = sessionEndReason(runtime);
    if (reason) {
      await this.sessions.completeInQueue(runtime, reason, new Date(this.clock.now()));
      runtime.hand = null;
      runtime.nextTransitionAt = null;
      this.resultTimers.delete(runtime.roomId);
      return;
    }
    const seats = runtime.participants.filter((participant, index) => runtime.stacks[index]! > 0)
      .map((participant) => participant.seat).sort((a, b) => a - b);
    const buttonSeat = seats.find((seat) => seat > runtime.buttonSeat) ?? seats[0]!;
    const nextHandId = randomUUID();
    await this.sessions.nextHandInQueue(runtime, nextHandId, buttonSeat, new Date(this.clock.now()));
    runtime.paused = false;
    runtime.nextTransitionAt = null;
    this.resultTimers.delete(runtime.roomId);
    await this.dealFirstHand(runtime);
  }
}
