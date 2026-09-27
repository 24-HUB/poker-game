import { describe, expect, it, vi } from 'vitest';

import { readSession, signOut } from './auth-client';

describe('readSession', () => {
  it('returns an authenticated identity from the application envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { accountId: 'account-a', displayName: 'Alice' },
      error: null,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await expect(readSession(fetcher)).resolves.toEqual({
      status: 'authenticated',
      account: { accountId: 'account-a', displayName: 'Alice' },
    });
    expect(fetcher).toHaveBeenCalledWith('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
  });

  it('keeps unauthenticated distinct from a temporarily unavailable backend', async () => {
    const signedOut = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    const unavailable = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(readSession(signedOut)).resolves.toEqual({ status: 'unauthenticated' });
    await expect(readSession(unavailable)).resolves.toEqual({ status: 'unavailable' });
  });

  it('treats transport and malformed-response failures as unavailable', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('offline'));
    const malformed = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accountId: 'forged' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await expect(readSession(offline)).resolves.toEqual({ status: 'unavailable' });
    await expect(readSession(malformed)).resolves.toEqual({ status: 'unavailable' });
  });
});

describe('signOut', () => {
  it('uses the native provider endpoint with the session cookie', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await signOut(fetcher);

    expect(fetcher).toHaveBeenCalledWith('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
  });
});
