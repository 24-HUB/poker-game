import { afterEach, describe, expect, it, vi } from 'vitest';

import { readServerSession } from './server-api';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BACKEND_ORIGIN;
  delete process.env.PROXY_SECRET;
});

describe('readServerSession', () => {
  it('uses the fixed backend with the private proxy secret and uncached cookie', async () => {
    process.env.BACKEND_ORIGIN = 'https://backend.example';
    process.env.PROXY_SECRET = 'private-proxy-secret';
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accountId: 'account-a', displayName: 'Alice' },
      error: null,
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    await expect(readServerSession('session=private')).resolves.toEqual({
      data: { accountId: 'account-a', displayName: 'Alice' },
      error: null,
    });
    const [url, init] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://backend.example/api/me');
    expect(init).toEqual(expect.objectContaining({
      cache: 'no-store',
      headers: expect.objectContaining({
        cookie: 'session=private',
        'x-poker-proxy-secret': 'private-proxy-secret',
      }),
    }));
  });

  it('rejects a configured backend that is not an origin', async () => {
    process.env.BACKEND_ORIGIN = 'https://backend.example/hostile-path';
    process.env.PROXY_SECRET = 'private-proxy-secret';
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(readServerSession('session=private')).resolves.toMatchObject({
      data: null,
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
