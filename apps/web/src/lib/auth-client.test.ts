import { describe, expect, it, vi } from 'vitest';

import { readSession, signIn, signOut, signUp } from './auth-client';

describe('authentication error copy', () => {
  it.each(['INVALID_ORIGIN', 'FORBIDDEN', 'INVALID_REGISTRATION_CODE'])('does not mislabel sign-in 403 %s as a registration-code failure', async (code) => {
    await expect(signIn({ email: 'test@example.test', password: 'password' }, async () => new Response(JSON.stringify({ code }), { status: 403 })))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('reserves registration-code copy for a signup code rejection', async () => {
    await expect(signUp({ email: 'a@example.test', password: 'password', name: 'Alice', registrationCode: 'bad' },
      async () => new Response(JSON.stringify({ code: 'INVALID_REGISTRATION_CODE' }), { status: 403 })))
      .rejects.toMatchObject({ code: 'INVALID_REGISTRATION_CODE' });
  });
  it('keeps auth rate limits distinct from server startup', async () => {
    await expect(signIn({ email: 'a@example.test', password: 'password' }, async () => new Response('{}', { status: 429 })))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
});

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
