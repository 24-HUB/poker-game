import { describe, expect, it, vi } from 'vitest';
import { readHandHistory } from './hand-history';
describe('hand history read', () => {
  it('encodes the session/cursor in an uncached authenticated read', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: { hands: [], nextBeforeHandNumber: null }, error: null })));
    expect((await readHandHistory('room/a', 'session?a', 20, fetcher)).data?.hands).toEqual([]);
    expect(fetcher).toHaveBeenCalledWith('/api/rooms/room%2Fa/hands?sessionId=session%3Fa&beforeHandNumber=20', expect.objectContaining({ cache: 'no-store', credentials: 'include' }));
  });
  it('keeps unavailable reads distinct from an empty history', async () => {
    expect((await readHandHistory('room', 'session', undefined, async () => { throw new Error('offline'); })).error?.code).toBe('SERVICE_UNAVAILABLE');
  });
});
