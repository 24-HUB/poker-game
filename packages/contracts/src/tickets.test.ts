import { describe, expect, it } from 'vitest';

import { rewardReceiptSchema, walletViewSchema } from './tickets.js';

const receipt = {
  handId: 'hand-1', accountId: 'account-1', policyVersion: 1,
  completedDateUtc: '2026-09-30', qualified: true, reason: 'DAILY_CAP',
  requestedParticipation: 1, requestedBonus: 1,
  grantedParticipation: 0, grantedBonus: 0,
};

describe('ticket contracts', () => {
  it('rejectsUnsafeTicketCounts', () => {
    for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(rewardReceiptSchema.safeParse({ ...receipt, grantedBonus: invalid }).success).toBe(false);
      expect(walletViewSchema.safeParse({
        balance: invalid, revision: 0, utcDate: '2026-09-30',
        earnedToday: 0, dailyCap: 20, remainingToday: 20,
      }).success).toBe(false);
    }
  });

  it('rewardReceiptExplainsZeroAward', () => {
    expect(rewardReceiptSchema.parse(receipt)).toEqual(receipt);
    expect(rewardReceiptSchema.parse({
      ...receipt, qualified: false, reason: 'NO_MANUAL_ACTION',
      requestedParticipation: 0, requestedBonus: 0,
    }).reason).toBe('NO_MANUAL_ACTION');
  });
});
