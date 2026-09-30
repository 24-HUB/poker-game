export type CancelTimer = () => void;
export type GameClock = { now(): number; schedule(atMs: number, callback: () => void): CancelTimer };
export const GAME_CLOCK = Symbol('GAME_CLOCK');

export class SystemGameClock implements GameClock {
  public now(): number { return Date.now(); }
  public schedule(atMs: number, callback: () => void): CancelTimer {
    const timer = setTimeout(callback, Math.max(0, atMs - this.now()));
    timer.unref();
    return () => clearTimeout(timer);
  }
}
