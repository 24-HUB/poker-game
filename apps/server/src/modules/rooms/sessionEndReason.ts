import type { SessionResult } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { SessionRuntime } from './session.service';

export function sessionEndReason(runtime: SessionRuntime): SessionResult['reason'] | null {
  if (runtime.ending) return 'HOST_ENDED';
  if (runtime.mode === 'practice' && !runtime.participants.some((player, index) => player.kind !== 'bot' && runtime.stacks[index]! > 0)) return 'NO_FUNDED_HUMANS';
  return runtime.stacks.filter((stack) => stack > 0).length < 2 ? 'ONE_FUNDED' : null;
}
