import type { CommandOutcome } from '@poker/contracts' with { 'resolution-mode': 'import' };

type Entry = { payloadHash: string; outcome: CommandOutcome; expiresAt: number };
type Lookup = { kind: 'miss' | 'conflict' | 'stale' | 'full' } | { kind: 'hit'; outcome: CommandOutcome };

export class GameCommandCache {
  private readonly accounts = new Map<string, Map<string, Entry>>();

  public constructor(private readonly maxPerAccount = 1_000) {}

  public lookup(accountId: string, commandId: string, payloadHash: string,
    handId: string, previousHandId: string | null, now: number): Lookup {
    const commands = this.accounts.get(accountId);
    for (const [id, entry] of commands ?? []) {
      if (entry.expiresAt <= now ||
          (entry.outcome.handId !== handId && entry.outcome.handId !== previousHandId)) commands?.delete(id);
    }
    const entry = commands?.get(commandId);
    if (entry) {
      if (entry.payloadHash !== payloadHash) return { kind: 'conflict' };
      if (entry.outcome.handId !== handId && entry.outcome.handId !== previousHandId) return { kind: 'stale' };
      return { kind: 'hit', outcome: entry.outcome };
    }
    return (commands?.size ?? 0) >= this.maxPerAccount ? { kind: 'full' } : { kind: 'miss' };
  }

  public store(accountId: string, commandId: string, payloadHash: string,
    outcome: CommandOutcome, expiresAt: number): void {
    const commands = this.accounts.get(accountId) ?? new Map<string, Entry>();
    commands.set(commandId, { payloadHash, outcome, expiresAt });
    this.accounts.set(accountId, commands);
  }
}
