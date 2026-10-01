import { describe, expect, it } from 'vitest';
import { savePendingPull, readPendingPull, clearPendingPull } from './pendingPull';

describe('account-scoped pending purchase identity', () => {
  const storage = () => {
    const rows = new Map<string, string>();
    return { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => { rows.set(key, value); }, removeItem: (key: string) => { rows.delete(key); } };
  };
  const input = { requestId: crypto.randomUUID(), bannerVersion: 'celestial-v1', count: 10 as const };
  it('retains the same payload across reload and account switches', () => {
    const store = storage();
    savePendingPull('alice', input, store);
    expect(readPendingPull('alice', store)).toEqual(input);
    expect(readPendingPull('bob', store)).toBeNull();
    expect(readPendingPull('alice', store)?.requestId).toBe(input.requestId);
    clearPendingPull('bob', store);
    expect(readPendingPull('alice', store)).toEqual(input);
    clearPendingPull('alice', store);
    expect(readPendingPull('alice', store)).toBeNull();
  });
  it('refuses to silently replace an unresolved request', () => {
    const store = storage(); savePendingPull('alice', input, store);
    expect(() => savePendingPull('alice', { ...input, requestId: crypto.randomUUID() }, store)).toThrow();
    expect(readPendingPull('alice', store)).toEqual(input);
  });
  it('surfaces denied or corrupted storage before a debit can be sent', () => {
    const store = storage();
    const denied = { ...store, setItem: () => { throw new Error('Denied'); } };
    expect(() => savePendingPull('alice', input, denied)).toThrow();
    store.setItem('poker.pendingPull.alice', '{broken');
    expect(() => readPendingPull('alice', store)).toThrow();
    store.setItem('poker.pendingPull.alice', JSON.stringify({ ...input, count: 2 }));
    expect(() => readPendingPull('alice', store)).toThrow();
  });
});
