import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

const proxySecretHeader = 'x-poker-proxy-secret';

export function verifyProxyRequest(headers: IncomingHttpHeaders): boolean {
  const expected = process.env.PROXY_SECRET;
  const provided = headers[proxySecretHeader];
  if (!expected || typeof provided !== 'string') return false;

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export function verifyPublicOrigin(headers: IncomingHttpHeaders): boolean {
  const configured = process.env.PUBLIC_ORIGIN;
  if (!configured || typeof headers.origin !== 'string') return false;
  const origin = parsePublicOrigin(configured);
  return origin !== null && headers.origin === origin.origin;
}

export function parsePublicOrigin(value: string): URL | null {
  try {
    const origin = new URL(value);
    const isLoopback = origin.hostname === 'localhost'
      || origin.hostname === '127.0.0.1'
      || origin.hostname === '[::1]';
    const allowedProtocol = origin.protocol === 'https:'
      || (process.env.NODE_ENV !== 'production' && origin.protocol === 'http:' && isLoopback);
    if (
      !allowedProtocol
      || origin.username
      || origin.password
      || origin.pathname !== '/'
      || origin.search
      || origin.hash
    ) return null;
    return origin;
  } catch {
    return null;
  }
}

export function proxyGuard(request: IncomingMessage, response: ServerResponse, next: () => void): void {
  const pathname = new URL(request.url ?? '/', 'http://backend.invalid').pathname;
  if (pathname === '/health/live' || pathname === '/health/deploy') {
    next();
    return;
  }

  if (!verifyProxyRequest(request.headers) || !hasTrustedOrigin(request, pathname)) {
    response.statusCode = 403;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ status: 'forbidden' }));
    return;
  }

  next();
}

function hasTrustedOrigin(request: IncomingMessage, pathname: string): boolean {
  const isSocket = pathname === '/socket.io' || pathname.startsWith('/socket.io/');
  const isMutation = request.method !== 'GET' && request.method !== 'HEAD';
  if (!isSocket && !isMutation) return true;

  return verifyPublicOrigin(request.headers);
}
