import type { CommittedHandResult, SessionResult } from '@poker/contracts' with { 'resolution-mode': 'import' };

export function normalizeHandResult(result: CommittedHandResult): CommittedHandResult {
  return { ...result, mode: result.mode ?? 'standard', ...(result.presentation ? { presentation: {
    ...result.presentation, participants: result.presentation.participants.map((player) => ({ ...player, kind: player.kind ?? 'human' })),
  } } : {}) };
}

export function normalizeSessionResult(result: SessionResult): SessionResult {
  return { ...result, mode: result.mode ?? 'standard', standings: result.standings.map((player) => ({ ...player, kind: player.kind ?? 'human' })) };
}
