import { afterEach, describe, expect, it, vi } from 'vitest';

import { isBackendPath, proxyBackend, routeWorkerRequest, type BackendEnv } from './proxy';

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

  it('replaces spoofed client IP headers with the Cloudflare supplied address', async () => {
    let forwarded: Request | undefined;
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => { forwarded = request; return new Response('{}'); }));
    await proxyBackend(new Request('https://play.example/api/me', { headers: {
      'cf-connecting-ip': '203.0.113.7', 'x-poker-client-ip': '198.51.100.9',
      'x-forwarded-for': '198.51.100.10',
    } }), env);
    expect(forwarded!.headers.get('x-poker-client-ip')).toBe('203.0.113.7');
    expect(forwarded!.headers.has('x-forwarded-for')).toBe(false);
  });

  it('delegatesNonBackendPathsToTheFrontendWorker', async () => {
    const frontendResponse = new Response('frontend shell');

    const response = await routeWorkerRequest(
      new Request('https://play.example/apiary'),
      env,
      async () => frontendResponse,
    );

    expect(response).toBe(frontendResponse);
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

  it('preservesSocketUpgradeWithoutWrappingTheResponse', async () => {
    const switchingProtocols = { status: 101 } as Response;
    let forwarded: Request | undefined;
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      forwarded = request;
      return switchingProtocols;
    }));

    const response = await proxyBackend(new Request('https://play.example/socket.io/?EIO=4&transport=websocket', {
      headers: {
        origin: 'https://play.example',
        connection: 'Upgrade',
        upgrade: 'websocket',
      },
    }), env);

    expect(response.status).toBe(101);
    expect(response).toBe(switchingProtocols);
    expect(forwarded!.headers.get('upgrade')).toBe('websocket');
    expect(forwarded!.headers.get('connection')).toBe('Upgrade');
  });

  it('rejectsNonHttpsOrPathBearingBackendOrigins', async () => {
    await expect(proxyBackend(new Request('https://play.example/api/me'), {
      ...env,
      BACKEND_ORIGIN: 'http://backend.example',
    })).rejects.toThrow('BACKEND_ORIGIN must be a valid HTTPS origin');
    await expect(proxyBackend(new Request('https://play.example/api/me'), {
      ...env,
      BACKEND_ORIGIN: 'https://backend.example/chosen/by/client',
    })).rejects.toThrow('BACKEND_ORIGIN must be a valid HTTPS origin');
  });

  it('streamsMutationBodyAndCookiesToTheFixedBackend', async () => {
    let forwardedBody = '';
    let forwardedCookie: string | null = null;
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      forwardedBody = await request.text();
      forwardedCookie = request.headers.get('cookie');
      return new Response(null, { status: 204 });
    }));

    const response = await proxyBackend(new Request('https://play.example/api/rooms', {
      method: 'POST',
      headers: {
        origin: 'https://play.example',
        cookie: 'session=opaque',
        'content-type': 'application/json',
      },
      body: '{"title":"Tea Room"}',
    }), env);

    expect(response.status).toBe(204);
    expect(forwardedBody).toBe('{"title":"Tea Room"}');
    expect(forwardedCookie).toBe('session=opaque');
  });

  it('returns504WhenBackendTimesOut', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('The operation timed out', 'TimeoutError');
    }));

    const response = await proxyBackend(new Request('https://play.example/api/me'), env);

    expect(response.status).toBe(504);
    expect(await response.text()).toBe('Backend timeout');
  });
});
