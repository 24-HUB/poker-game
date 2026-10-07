export type CancelTimer = () => void;
export type GameClock = { now(): number; schedule(atMs: number, callback: () => void): CancelTimer };
export const GAME_CLOCK = Symbol('GAME_CLOCK');

export class SystemGameClock implements GameClock {
  public now(): number { return Date.now(); }
  public schedule(atMs: number, callback: () => void): CancelTimer {
    const dispatch = () => {
      const remaining = atMs - this.now();
      if (remaining > 0) {
        // Native timers can fire before the wall-clock deadline checked by the game.
        timer = setTimeout(dispatch, remaining);
        timer.unref();
        return;
      }
      callback();
    };
    let timer = setTimeout(dispatch, Math.max(0, atMs - this.now()));
    timer.unref();
    return () => clearTimeout(timer);
  }
}
