import type { GameView } from '@poker/contracts';

// Timestamp receipt once per snapshot, rather than interpreting remount time as server time.
const offsets = new WeakMap<GameView, number>();
export function serverClockOffset(game: GameView): number {
  let offset = offsets.get(game);
  if (offset === undefined) { offset = Date.parse(game.serverTime) - Date.now(); offsets.set(game, offset); }
  return offset;
}
