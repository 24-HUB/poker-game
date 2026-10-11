import { describe, expect, it, vi } from 'vitest';
import { readCurrentRoom } from './current-room';

describe('current room read', () => {
  it('reads uncached authenticated membership and validates the summary', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: { roomId: 'room-a', title: 'Friday', phase: 'playing' }, error: null })));
    expect(await readCurrentRoom(fetcher)).toEqual({ data: { roomId: 'room-a', title: 'Friday', phase: 'playing' }, error: null });
    expect(fetcher).toHaveBeenCalledWith('/api/rooms/current', expect.objectContaining({ cache: 'no-store', credentials: 'include', signal: expect.any(AbortSignal) }));
  });
  it('does not turn network failure or malformed private data into empty membership', async () => {
    expect((await readCurrentRoom(async () => { throw new Error('offline'); })).error?.code).toBe('SERVICE_UNAVAILABLE');
    expect((await readCurrentRoom(async () => new Response(JSON.stringify({ data: { roomId: 'a', title: 'Private', phase: 'playing', invitation: 'secret' }, error: null })))).error?.code).toBe('SERVICE_UNAVAILABLE');
  });
});
