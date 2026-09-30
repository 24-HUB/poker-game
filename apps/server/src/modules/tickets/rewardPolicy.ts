import type { RewardPolicy, RewardReceipt } from '@poker/contracts' with { 'resolution-mode': 'import' };

export const M3_REWARD_POLICY: RewardPolicy = Object.freeze({
  version: 1,
  participation: 1,
  winBonus: 1,
  dailyCap: 20,
  dealtInRequired: true,
  manualActionRequired: true,
});

type RewardInput = { dealtIn: boolean; manualAction: boolean; netChips: number; earnedToday: number };
type CalculatedReward = Pick<RewardReceipt,
  'qualified' | 'reason' | 'requestedParticipation' | 'requestedBonus' | 'grantedParticipation' | 'grantedBonus'>;

export function calculateReward(input: RewardInput, policy: RewardPolicy): CalculatedReward {
  if (!Number.isSafeInteger(input.netChips) || !Number.isSafeInteger(input.earnedToday) || input.earnedToday < 0) {
    throw new Error('Invalid reward inputs');
  }
  const reason = policy.dealtInRequired && !input.dealtIn ? 'NOT_DEALT_IN'
    : policy.manualActionRequired && !input.manualAction ? 'NO_MANUAL_ACTION' : null;
  if (reason) return {
    qualified: false, reason, requestedParticipation: 0, requestedBonus: 0,
    grantedParticipation: 0, grantedBonus: 0,
  };
  const requestedParticipation = policy.participation;
  const requestedBonus = input.netChips > 0 ? policy.winBonus : 0;
  const remaining = Math.max(0, policy.dailyCap - input.earnedToday);
  const grantedParticipation = Math.min(remaining, requestedParticipation);
  const grantedBonus = Math.min(remaining - grantedParticipation, requestedBonus);
  return {
    qualified: true,
    reason: grantedParticipation + grantedBonus ? 'AWARDED' : 'DAILY_CAP',
    requestedParticipation, requestedBonus, grantedParticipation, grantedBonus,
  };
}
