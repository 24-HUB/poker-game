import { z } from 'zod';

const id = z.string().min(1).max(128);
const count = z.number().int().nonnegative().safe();

export const rewardPolicySchema = z.object({
  version: count.positive(),
  participation: count,
  winBonus: count,
  dailyCap: count,
  dealtInRequired: z.boolean(),
  manualActionRequired: z.boolean(),
}).strict();
export type RewardPolicy = z.infer<typeof rewardPolicySchema>;

export const rewardReceiptSchema = z.object({
  handId: id,
  accountId: id,
  policyVersion: count.positive(),
  completedDateUtc: z.iso.date(),
  qualified: z.boolean(),
  reason: z.enum(['AWARDED', 'NOT_DEALT_IN', 'NO_MANUAL_ACTION', 'DAILY_CAP']),
  requestedParticipation: count,
  requestedBonus: count,
  grantedParticipation: count,
  grantedBonus: count,
}).strict();
export type RewardReceipt = z.infer<typeof rewardReceiptSchema>;

export const walletViewSchema = z.object({
  balance: count,
  revision: count,
  utcDate: z.iso.date(),
  earnedToday: count,
  dailyCap: count,
  remainingToday: count,
}).strict();
export type WalletView = z.infer<typeof walletViewSchema>;
