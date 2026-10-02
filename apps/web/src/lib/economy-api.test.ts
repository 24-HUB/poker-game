import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { resultSchema } from '@poker/contracts';
import { economyMutation } from './economy-api';

describe('durable mutation responses', () => {
  const schema = resultSchema(z.object({ saved: z.boolean() }));
  it('keeps interruption and malformed responses uncertain', async () => {
    expect((await economyMutation('/api/pulls', 'POST', {}, schema, vi.fn().mockRejectedValue(new Error('offline')))).error?.code).toBe('COMMAND_UNCERTAIN');
    expect((await economyMutation('/api/pulls', 'POST', {}, schema, vi.fn().mockResolvedValue(new Response('{}')))).error?.code).toBe('COMMAND_UNCERTAIN');
  });
  it('returns committed outcomes and explicit rejections without replacing their meaning', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { saved: true }, error: null })));
    expect((await economyMutation('/api/equipment/avatar', 'PUT', { expectedRevision: 1 }, schema, fetcher)).data).toEqual({ saved: true });
    expect(fetcher).toHaveBeenCalledWith('/api/equipment/avatar', expect.objectContaining({ method: 'PUT', credentials: 'include', cache: 'no-store' }));
    const rejection = { data: null, error: { code: 'INSUFFICIENT_TICKETS', message: 'Earn tickets first.' } };
    expect(await economyMutation('/api/pulls', 'POST', {}, schema, vi.fn().mockResolvedValue(new Response(JSON.stringify(rejection), { status: 400 })))).toEqual(rejection);
  });
});
