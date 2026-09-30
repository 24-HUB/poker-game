import { calculateReward, M3_REWARD_POLICY } from './rewardPolicy';

describe('calculateReward', () => {
  const eligible = { dealtIn: true, manualAction: true, netChips: 0, earnedToday: 0 };

  it('grants participation and only a positive-net bonus', () => {
    expect(calculateReward({ ...eligible, netChips: 20 }, M3_REWARD_POLICY)).toMatchObject({
      qualified: true, requestedParticipation: 1, requestedBonus: 1,
      grantedParticipation: 1, grantedBonus: 1,
    });
    expect(calculateReward({ ...eligible, netChips: -20 }, M3_REWARD_POLICY).grantedParticipation).toBe(1);
    expect(calculateReward(eligible, M3_REWARD_POLICY).grantedBonus).toBe(0);
  });

  it('rejects automatic-only or undealt participants', () => {
    expect(calculateReward({ ...eligible, manualAction: false }, M3_REWARD_POLICY)).toMatchObject({
      qualified: false, reason: 'NO_MANUAL_ACTION', grantedParticipation: 0, grantedBonus: 0,
    });
    expect(calculateReward({ ...eligible, dealtIn: false }, M3_REWARD_POLICY)).toMatchObject({
      qualified: false, reason: 'NOT_DEALT_IN', grantedParticipation: 0, grantedBonus: 0,
    });
  });

  it('allocates the last daily ticket to participation first', () => {
    expect(calculateReward({ ...eligible, netChips: 20, earnedToday: 19 }, M3_REWARD_POLICY)).toMatchObject({
      qualified: true, reason: 'AWARDED', grantedParticipation: 1, grantedBonus: 0,
    });
    expect(calculateReward({ ...eligible, netChips: 20, earnedToday: 20 }, M3_REWARD_POLICY)).toMatchObject({
      qualified: true, reason: 'DAILY_CAP', grantedParticipation: 0, grantedBonus: 0,
    });
  });
});
