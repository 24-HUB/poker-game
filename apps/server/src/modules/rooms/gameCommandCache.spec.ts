import { GameCommandCache } from './gameCommandCache';

describe('game command retry cache', () => {
  const outcome = (handId: string) => ({
    commandId: '11111111-1111-4111-8111-111111111111', sessionId: 'session',
    handId, acceptedGameVersion: 1,
  });

  it('rejects new commands at capacity while preserving retry identity', () => {
    const cache = new GameCommandCache(1);
    cache.store('a', 'one', 'hash-a', outcome('hand-a'), 1000);
    expect(cache.lookup('a', 'one', 'hash-a', 'hand-a', null, 100)).toMatchObject({ kind: 'hit' });
    expect(cache.lookup('a', 'one', 'hash-b', 'hand-a', null, 100)).toEqual({ kind: 'conflict' });
    expect(cache.lookup('a', 'two', 'hash-b', 'hand-a', null, 100)).toEqual({ kind: 'full' });
  });

  it('releases entries older than the previous hand', () => {
    const cache = new GameCommandCache(1);
    cache.store('a', 'one', 'hash-a', outcome('hand-a'), 1000);
    expect(cache.lookup('a', 'two', 'hash-b', 'hand-c', 'hand-b', 100)).toEqual({ kind: 'miss' });
    expect(cache.lookup('a', 'one', 'hash-a', 'hand-c', 'hand-b', 100)).toEqual({ kind: 'miss' });
  });
});
