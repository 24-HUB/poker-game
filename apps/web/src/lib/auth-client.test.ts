import { afterEach, describe, expect, it, vi } from 'vitest';

import { readSession, signIn, signOut, signUp, resendVerification, requestPasswordReset, verifyEmail, resetPassword } from './auth-client';

describe('authentication error copy', () => {
  it('posts leading-zero codes and passwords only in native request bodies', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response('{"status":true}'));
    await resendVerification('a@example.test', fetcher); await requestPasswordReset('a@example.test', fetcher);
    await verifyEmail('a@example.test', '000042', fetcher); await resetPassword('a@example.test', '000043', 'new-password', fetcher);
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
      '/api/auth/email-otp/send-verification-otp', '/api/auth/email-otp/request-password-reset',
      '/api/auth/email-otp/verify-email', '/api/auth/email-otp/reset-password',
    ]);
    expect(JSON.parse(fetcher.mock.calls[2]![1].body)).toEqual({ email: 'a@example.test', otp: '000042' });
    expect(JSON.parse(fetcher.mock.calls[3]![1].body)).toEqual({ email: 'a@example.test', otp: '000043', password: 'new-password' });
  });
  it('keeps code errors and rate retry intervals distinct from outages', async () => {
    await expect(verifyEmail('a@example.test', '000042', async () => new Response('{"code":"INVALID_CODE"}', { status: 400 })))
      .rejects.toMatchObject({ code: 'INVALID_CODE' });
    await expect(resendVerification('a@example.test', async () => new Response('{}', { status: 429, headers: { 'retry-after': '42' } })))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 42 });
  });
  it('explains an uncertain reset without reporting success or automatically retrying', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'));
    await expect(resetPassword('a@example.test', '000042', 'intended-password', fetcher)).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE', message: expect.stringContaining('Try signing in with your intended password'),
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
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
  afterEach(() => vi.useRealTimers());
  it.each([
    [403, undefined, 'blocked', undefined],
    [408, undefined, 'retryable', undefined],
    [504, undefined, 'retryable', undefined],
    [429, '12', 'rate-limited', 12_000],
    [429, 'invalid', 'rate-limited', 60_000],
    [429, '0', 'rate-limited', 0],
    [429, '-1', 'rate-limited', 60_000],
  ])('classifies %s with Retry-After %s', async (status, retryAfter, reason, delay) => {
    const result = await readSession(async () => new Response('{}', { status: status as number, headers: retryAfter === undefined ? {} : { 'retry-after': String(retryAfter) } }));
    expect(result).toMatchObject({ status: 'unavailable', reason });
    if (delay !== undefined) expect(result).toMatchObject({ retryAt: expect.any(Number) });
    if (delay !== undefined && result.status === 'unavailable') expect(result.retryAt! - Date.now()).toBeGreaterThanOrEqual((delay as number) - 50);
  });
  it('honors HTTP-date rate limits', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T00:00:00Z'));
    await expect(readSession(async () => new Response('{}', { status: 429, headers: { 'retry-after': 'Wed, 14 Oct 2026 00:00:30 GMT' } })))
      .resolves.toMatchObject({ reason: 'rate-limited', retryAt: Date.now() + 30_000 });
  });
  it('bounds body parsing and cancels an external signal without classifying logout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => new Promise(() => {}) });
    const pending = readSession(fetcher, { timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toMatchObject({ status: 'unavailable', reason: 'retryable' });
    const controller = new AbortController();
    const canceled = readSession(fetcher, { signal: controller.signal });
    controller.abort();
    await expect(canceled).rejects.toMatchObject({ name: 'AbortError' });
  });
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
      signal: expect.any(AbortSignal),
      headers: { accept: 'application/json' },
    });
  });

  it('keeps unauthenticated distinct from a temporarily unavailable backend', async () => {
    const signedOut = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    const unavailable = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(readSession(signedOut)).resolves.toEqual({ status: 'unauthenticated' });
    await expect(readSession(unavailable)).resolves.toEqual({ status: 'unavailable', reason: 'retryable' });
  });

  it('treats transport and malformed-response failures as unavailable', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('offline'));
    const malformed = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accountId: 'forged' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await expect(readSession(offline)).resolves.toEqual({ status: 'unavailable', reason: 'retryable' });
    await expect(readSession(malformed)).resolves.toEqual({ status: 'unavailable', reason: 'retryable' });
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
