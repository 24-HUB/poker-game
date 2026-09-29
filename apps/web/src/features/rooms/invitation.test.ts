import { describe, expect, it } from 'vitest';

import {
  clearPendingInvitation,
  readInvitationFragment,
  readPendingInvitation,
  storePendingInvitation,
} from './invitation';

describe('readInvitationFragment', () => {
  it.each(['', '#', '#other=value', '#invite=', '#invite=%20'])('rejects a missing invitation in %j', (hash) => {
    expect(readInvitationFragment(hash)).toBeNull();
  });

  it('decodes a fragment invitation without accepting query strings or room ids', () => {
    expect(readInvitationFragment('#invite=secret%2Ftoken%2Bvalue')).toBe('secret/token+value');
    expect(readInvitationFragment('?invite=secret')).toBeNull();
    expect(readInvitationFragment('#roomId=room-123')).toBeNull();
  });

  it('keeps a pending invitation in tab storage for at most fifteen minutes', () => {
    const storage = new MemoryStorage();
    storePendingInvitation('private-token', storage, 1_000);

    expect(readPendingInvitation(storage, 1_000 + 15 * 60_000 - 1)).toBe('private-token');
    expect(readPendingInvitation(storage, 1_000 + 15 * 60_000)).toBeNull();
    expect(storage.length).toBe(0);
  });

  it('clears a consumed invitation without touching unrelated tab state', () => {
    const storage = new MemoryStorage();
    storage.setItem('unrelated', 'keep');
    storePendingInvitation('private-token', storage, 1_000);

    clearPendingInvitation(storage);

    expect(readPendingInvitation(storage, 1_001)).toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
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
