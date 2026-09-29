import { resultSchema } from '@poker/contracts';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiGet } from './api';

describe('apiGet', () => {
  const schema = resultSchema(z.object({ accountId: z.string() }).strict());

  it('returns a validated uncached application envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accountId: 'account-a' },
      error: null,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await expect(apiGet('/api/me', schema, fetcher)).resolves.toEqual({
      data: { accountId: 'account-a' },
      error: null,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/me', expect.objectContaining({
      credentials: 'include',
      cache: 'no-store',
    }));
  });

  it('fails closed when an upstream response does not match the result schema', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"accountId":"forged"}', { status: 200 }));

    await expect(apiGet('/api/me', schema, fetcher)).resolves.toEqual({
      data: null,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'The server returned an invalid response.' },
    });
  });
});
