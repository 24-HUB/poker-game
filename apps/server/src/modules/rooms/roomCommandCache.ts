import type { Result, RoomReply } from '@poker/contracts' with { 'resolution-mode': 'import' };

type CacheEntry = {
  payloadHash: string;
  expiresAt: number;
  reply: Result<RoomReply>;
};

type PendingEntry = {
  payloadHash: string;
  promise: Promise<Result<RoomReply>>;
  resolve: (reply: Result<RoomReply>) => void;
};

export type CommandCacheLookup =
  | { kind: 'miss' }
  | { kind: 'conflict' }
  | { kind: 'pending'; promise: Promise<Result<RoomReply>> }
  | { kind: 'hit'; reply: Result<RoomReply> };

export type CommandReservation =
  | { kind: 'acquired' }
  | { kind: 'conflict' }
  | { kind: 'full' }
  | { kind: 'pending'; promise: Promise<Result<RoomReply>> };

export class RoomCommandCache {
  private readonly entries = new Map<string, Map<string, CacheEntry>>();
  private readonly pending = new Map<string, Map<string, PendingEntry>>();

  public constructor(private readonly maximumEntriesPerAccount = 1_000) {}

  public reserve(accountId: string, commandId: string, payloadHash: string, now: number): CommandReservation {
    const accountEntries = this.entries.get(accountId);
    for (const [cachedCommandId, entry] of accountEntries ?? []) {
      if (entry.expiresAt <= now) accountEntries?.delete(cachedCommandId);
    }
    const existing = accountEntries?.get(commandId);
    if (existing) {
      return existing.payloadHash === payloadHash
        ? { kind: 'pending', promise: Promise.resolve(existing.reply) }
        : { kind: 'conflict' };
    }
    const accountPending = this.pending.get(accountId) ?? new Map<string, PendingEntry>();
    const pending = accountPending.get(commandId);
    if (pending) {
      return pending.payloadHash === payloadHash
        ? { kind: 'pending', promise: pending.promise }
        : { kind: 'conflict' };
    }
    if ((accountEntries?.size ?? 0) + accountPending.size >= this.maximumEntriesPerAccount) {
      return { kind: 'full' };
    }
    let resolve!: (reply: Result<RoomReply>) => void;
    const promise = new Promise<Result<RoomReply>>((accept) => {
      resolve = accept;
    });
    accountPending.set(commandId, { payloadHash, promise, resolve });
    this.pending.set(accountId, accountPending);
    return { kind: 'acquired' };
  }

  public lookup(accountId: string, commandId: string, payloadHash: string, now: number): CommandCacheLookup {
    const accountEntries = this.entries.get(accountId);
    const entry = accountEntries?.get(commandId);
    if (!entry) {
      const pending = this.pending.get(accountId)?.get(commandId);
      if (!pending) return { kind: 'miss' };
      if (pending.payloadHash !== payloadHash) return { kind: 'conflict' };
      return { kind: 'pending', promise: pending.promise };
    }
    if (entry.expiresAt <= now) {
      accountEntries?.delete(commandId);
      return { kind: 'miss' };
    }
    if (entry.payloadHash !== payloadHash) return { kind: 'conflict' };
    return { kind: 'hit', reply: entry.reply };
  }

  public store(
    accountId: string,
    commandId: string,
    payloadHash: string,
    expiresAt: number,
    reply: Result<RoomReply>,
  ): void {
    const accountEntries = this.entries.get(accountId) ?? new Map<string, CacheEntry>();
    accountEntries.set(commandId, { payloadHash, expiresAt, reply });
    this.entries.set(accountId, accountEntries);
    const accountPending = this.pending.get(accountId);
    accountPending?.get(commandId)?.resolve(reply);
    accountPending?.delete(commandId);
    if (accountPending?.size === 0) this.pending.delete(accountId);
  }

  public cancel(accountId: string, commandId: string, reply: Result<RoomReply>): void {
    const accountPending = this.pending.get(accountId);
    accountPending?.get(commandId)?.resolve(reply);
    accountPending?.delete(commandId);
    if (accountPending?.size === 0) this.pending.delete(accountId);
  }
}
