import type { PokerAction } from '@poker/poker-engine';
import type { GameClock, CancelTimer } from '../../../infrastructure/gameClock';

export type TurnPlan = {
  sessionId: string; handId: string; gameVersion: number; actor: string; bootId: string; epoch: number;
  action: PokerAction | null; safetyMs: number; botMs: number | null;
};
export type ScheduledTurn = TurnPlan & { generation: number; safetyAt: number; botAt: number | null };

/** One generation owns both timers; restoring retains the action and active-play time. */
export class BotTurnScheduler {
  private generation = 0;
  private readonly pending = new Map<string, { turn: ScheduledTurn; cancel: CancelTimer[]; due: (turn: ScheduledTurn, bot: boolean) => void; retry?: CancelTimer }>();
  public constructor(private readonly clock: GameClock) {}

  public arm(roomId: string, plan: TurnPlan, due: (turn: ScheduledTurn, bot: boolean) => void): ScheduledTurn {
    this.cancel(roomId);
    const turn = { ...plan, generation: ++this.generation, safetyAt: this.clock.now() + plan.safetyMs,
      botAt: plan.botMs === null ? null : this.clock.now() + plan.botMs };
    const cancel = [this.clock.schedule(turn.safetyAt, () => due(turn, false))];
    if (turn.botAt !== null) cancel.push(this.clock.schedule(turn.botAt, () => due(turn, true)));
    this.pending.set(roomId, { turn, cancel, due });
    return turn;
  }
  public isCurrent(roomId: string, turn: ScheduledTurn): boolean { return this.pending.get(roomId)?.turn.generation === turn.generation; }
  public retry(roomId: string, turn: ScheduledTurn, bot: boolean): void {
    const pending = this.pending.get(roomId);
    if (!pending || !this.isCurrent(roomId, turn)) return;
    pending.retry?.();
    pending.retry = this.clock.schedule(this.clock.now() + 1000, () => {
      pending.retry = undefined;
      if (this.isCurrent(roomId, turn)) pending.due(turn, bot);
    });
  }
  public pause(roomId: string): TurnPlan | undefined {
    const pending = this.pending.get(roomId);
    if (!pending) return undefined;
    const turn = pending.turn;
    const plan = { ...turn, safetyMs: Math.max(0, turn.safetyAt - this.clock.now()),
      botMs: turn.botAt === null ? null : Math.max(0, turn.botAt - this.clock.now()) };
    this.cancel(roomId);
    return plan;
  }
  public cancel(roomId: string): void {
    this.pending.get(roomId)?.retry?.();
    this.pending.get(roomId)?.cancel.forEach((cancel) => cancel());
    this.pending.delete(roomId);
  }
  public dispose(): void { for (const roomId of this.pending.keys()) this.cancel(roomId); }
}
