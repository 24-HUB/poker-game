import { resultSchema, type Result } from '@poker/contracts';
import { z } from 'zod';

const identitySchema = z.object({ accountId: z.string(), displayName: z.string() }).strict();
const sessionResultSchema = resultSchema(identitySchema);

export async function readServerSession(
  cookieHeader: string,
): Promise<Result<{ accountId: string; displayName: string }>> {
  const backend = configuredBackendOrigin(process.env.BACKEND_ORIGIN);
  const proxySecret = process.env.PROXY_SECRET;
  if (!backend || !proxySecret) return unavailable();

  try {
    const response = await fetch(new URL('/api/me', backend), {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        cookie: cookieHeader,
        'x-poker-proxy-secret': proxySecret,
      },
      signal: AbortSignal.timeout(5_000),
    });
    const parsed = sessionResultSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : unavailable();
  } catch {
    return unavailable();
  }
}

function configuredBackendOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (
      (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && loopback))
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) return null;
    return url;
  } catch {
    return null;
  }
}

function unavailable(): Result<never> {
  return {
    data: null,
    error: { code: 'SERVICE_UNAVAILABLE', message: 'Session verification is temporarily unavailable.' },
  };
}
