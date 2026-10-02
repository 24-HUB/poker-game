import { pullRequestSchema, type PullRequest } from '@poker/contracts';

type PullStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const key = (accountId: string) => `poker.pendingPull.${accountId}`;
export function readPendingPull(accountId: string, storage: PullStorage = sessionStorage): PullRequest | null {
  const saved = storage.getItem(key(accountId));
  return saved === null ? null : pullRequestSchema.parse(JSON.parse(saved));
}
export function savePendingPull(accountId: string, input: PullRequest, storage: PullStorage = sessionStorage): void {
  const prior = readPendingPull(accountId, storage);
  if (prior && JSON.stringify(prior) !== JSON.stringify(input)) throw new Error('An unresolved invitation already exists');
  const valid = pullRequestSchema.parse(input);
  storage.setItem(key(accountId), JSON.stringify(valid));
  if (JSON.stringify(readPendingPull(accountId, storage)) !== JSON.stringify(valid)) throw new Error('Pending invitation could not be saved');
}
export function clearPendingPull(accountId: string, storage: PullStorage = sessionStorage): void { storage.removeItem(key(accountId)); }
