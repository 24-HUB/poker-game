import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { clearPendingCommand, readPendingCommand, storePendingCommand } from './pendingCommand';

describe('pending room commands', () => {
  it('lostCreateAckKeepsCommandId for the same account', () => {
    const storage = new MemoryStorage();
    const command = {
      type: 'room:create' as const,
      title: 'Private table',
      commandId: randomUUID(),
      authorityBootId: 'boot-a',
      issuedAt: new Date().toISOString(),
    };

    storePendingCommand('account-a', command, storage);

    expect(readPendingCommand('account-a', storage)).toEqual(command);
    expect(readPendingCommand('account-b', storage)).toBeNull();
  });

  it('clears the pending identity only after reconciliation', () => {
    const storage = new MemoryStorage();
    const command = {
      type: 'room:create' as const,
      title: 'Private table',
      commandId: randomUUID(),
      authorityBootId: 'boot-a',
      issuedAt: new Date().toISOString(),
    };
    storePendingCommand('account-a', command, storage);

    clearPendingCommand(storage);

    expect(readPendingCommand('account-a', storage)).toBeNull();
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  public get length() { return this.values.size; }
  public clear() { this.values.clear(); }
  public getItem(key: string) { return this.values.get(key) ?? null; }
  public key(index: number) { return [...this.values.keys()][index] ?? null; }
  public removeItem(key: string) { this.values.delete(key); }
  public setItem(key: string, value: string) { this.values.set(key, value); }
}
