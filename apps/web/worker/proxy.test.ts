import { afterEach, describe, expect, it, vi } from 'vitest';

import { isBackendPath, proxyBackend, type BackendEnv } from './proxy';

const env: BackendEnv = {
  BACKEND_ORIGIN: 'https://backend.example',
  PUBLIC_ORIGIN: 'https://play.example',
  PROXY_SECRET: 'server-owned-secret',
};

describe('backend Worker proxy', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('routesOnlyExactBackendPrefixes', () => {
    expect(isBackendPath('/api')).toBe(true);
    expect(isBackendPath('/api/me')).toBe(true);
    expect(isBackendPath('/socket.io/')).toBe(true);
    expect(isBackendPath('/apiary')).toBe(false);
    expect(isBackendPath('/socket.io.evil')).toBe(false);
    expect(isBackendPath('/')).toBe(false);
  });

  it('ignoresClientChosenUpstream', async () => {
    let forwarded: Request | undefined;
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      forwarded = request;
      return new Response(JSON.stringify({ ok: true }));
    }));

    await proxyBackend(new Request('https://play.example/api/me?upstream=https://evil.example', {
      headers: {
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'http',
        'x-poker-proxy-secret': 'client-value',
      },
    }), env);

    expect(new URL(forwarded!.url).origin).toBe(env.BACKEND_ORIGIN);
    expect(new URL(forwarded!.url).pathname).toBe('/api/me');
    expect(forwarded!.headers.get('x-forwarded-host')).toBe('play.example');
    expect(forwarded!.headers.get('x-forwarded-proto')).toBe('https');
    expect(forwarded!.headers.get('x-poker-proxy-secret')).toBe(env.PROXY_SECRET);
  });

  it('preservesCookieRedirectWithoutFollowingIt', async () => {
    const fetchMock = vi.fn(async (_request: Request) => {
      const headers = new Headers({ location: '/api/me' });
      headers.append('set-cookie', 'session=one; HttpOnly; Secure');
      headers.append('set-cookie', 'csrf=two; Secure');
      return new Response(null, { status: 302, headers });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxyBackend(new Request('https://play.example/api/auth/sign-in', {
      method: 'POST',
      headers: { origin: 'https://play.example' },
    }), env);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/api/me');
    expect(response.headers.getSetCookie()).toEqual([
      'session=one; HttpOnly; Secure',
      'csrf=two; Secure',
    ]);
    expect((fetchMock.mock.calls[0]?.[0] as Request).redirect).toBe('manual');
  });

  it('rejectsInvalidMutationAndSocketOrigins', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const mutation = await proxyBackend(new Request('https://play.example/api/rooms', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    }), env);
    const socket = await proxyBackend(new Request('https://play.example/socket.io/?EIO=4&transport=websocket', {
      headers: { origin: 'https://evil.example', upgrade: 'websocket' },
    }), env);

    expect(mutation.status).toBe(403);
    expect(socket.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
