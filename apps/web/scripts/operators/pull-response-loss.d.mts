import type { Page } from '@playwright/test';
export const HOSTED_ORIGIN: string;
export const ARM_PHRASE: string;
export function validateTarget(origin: string, mode: string): URL;
export type LossReport = {
  result: 'pass' | 'blocked' | 'fail'; committed: boolean; sameReceipt: boolean; singleDebit: boolean; mismatches: string[];
};
export function runPullResponseLoss(page: Page, options: {
  origin: string; mode: 'hosted' | 'fixture'; expectedDisplayName: string; confirmation: string;
  onArmed?: () => void | Promise<void>;
}): Promise<LossReport>;
