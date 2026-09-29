export type BackendEnv = {
  BACKEND_ORIGIN: string;
  PUBLIC_ORIGIN: string;
  PROXY_SECRET: string;
};

const proxySecretHeader = 'x-poker-proxy-secret';
const requestTimeoutMs = 15_000;

export function isBackendPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/') || pathname === '/socket.io' || pathname.startsWith('/socket.io/');
}

export function routeWorkerRequest(
  request: Request,
  env: BackendEnv,
  frontend: (request: Request) => Promise<Response>,
): Promise<Response> {
  if (isBackendPath(new URL(request.url).pathname)) return proxyBackend(request, env);
  return frontend(request);
}

export async function proxyBackend(request: Request, env: BackendEnv): Promise<Response> {
  const requestUrl = new URL(request.url);
  if (!isBackendPath(requestUrl.pathname)) return new Response('Not found', { status: 404 });

  const backendOrigin = parseConfiguredOrigin(env.BACKEND_ORIGIN, 'BACKEND_ORIGIN');
  const publicOrigin = parseConfiguredOrigin(env.PUBLIC_ORIGIN, 'PUBLIC_ORIGIN');
  if (!env.PROXY_SECRET) throw new Error('PROXY_SECRET is required');

  const isSocket = requestUrl.pathname === '/socket.io' || requestUrl.pathname.startsWith('/socket.io/');
  const isMutation = request.method !== 'GET' && request.method !== 'HEAD';
  if ((isSocket || isMutation) && request.headers.get('origin') !== publicOrigin.origin) {
    return new Response('Forbidden', { status: 403 });
  }

  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, backendOrigin);
  const headers = sanitizedHeaders(request.headers);
  headers.set('x-forwarded-host', publicOrigin.host);
  headers.set('x-forwarded-proto', publicOrigin.protocol.slice(0, -1));
  headers.set(proxySecretHeader, env.PROXY_SECRET);

  const isUpgrade = request.headers.get('upgrade')?.toLowerCase() === 'websocket';
  const forwarded = new Request(new Request(upstreamUrl, request), {
    headers,
    redirect: 'manual',
    signal: isUpgrade
      ? request.signal
      : AbortSignal.any([request.signal, AbortSignal.timeout(requestTimeoutMs)]),
  });
  let response: Response;
  try {
    response = await fetch(forwarded);
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new Response('Backend timeout', {
        status: 504,
        headers: { 'cache-control': 'no-store' },
      });
    }
    throw error;
  }
  if (isUpgrade) return response;

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('cache-control', 'no-store');
  responseHeaders.delete(proxySecretHeader);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function parseConfiguredOrigin(value: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS origin`);
  }
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error(`${name} must be a valid HTTPS origin`);
  }
  return url;
}

function sanitizedHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const name of [...headers.keys()]) {
    if (name === 'forwarded' || name === 'x-real-ip' || name.startsWith('x-forwarded-') || name === proxySecretHeader) {
      headers.delete(name);
    }
  }
  return headers;
}
