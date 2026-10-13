import { z } from 'zod';
import type { PokerAuth } from './auth';
import { EmailCodeError } from './emailCodePolicy';
import type { EmailCodeService } from './emailCode.service';

const routes = {
  send: '/api/auth/email-otp/send-verification-otp', verify: '/api/auth/email-otp/verify-email',
  request: '/api/auth/email-otp/request-password-reset', reset: '/api/auth/email-otp/reset-password',
};
const email = z.email();
const schemas = {
  send: z.object({ email, type: z.literal('email-verification') }).strict(),
  verify: z.object({ email, otp: z.string() }).strict(),
  request: z.object({ email }).strict(),
  reset: z.object({ email, otp: z.string(), password: z.string().min(8).max(128) }).strict(),
};
function json(body: object, status = 200, retryAfter?: number): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...(retryAfter ? { 'retry-after': String(retryAfter) } : {}) } });
}
function failure(error: unknown): Response {
  const code = error instanceof EmailCodeError ? error.code : 'SERVICE_UNAVAILABLE';
  const messages = {
    INVALID_CODE: 'This code is invalid, expired, replaced or exhausted. Request a new code.',
    RATE_LIMITED: 'Please wait before trying again.', INVALID_PASSWORD: 'Use a password with 8–128 characters.',
    INVALID_INPUT: 'Check the email and code, then try again.', SERVICE_UNAVAILABLE: 'The server could not confirm this request. Try again shortly.',
  };
  return json({ code, message: messages[code] }, code === 'RATE_LIMITED' ? 429 : code === 'SERVICE_UNAVAILABLE' ? 503 : 400,
    error instanceof EmailCodeError ? error.retryAfterSeconds : undefined);
}
async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new EmailCodeError('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new EmailCodeError('INVALID_INPUT');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 32_768) { void reader.cancel().catch(() => {}); throw new EmailCodeError('INVALID_INPUT'); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new EmailCodeError('INVALID_INPUT'); }
}

export function wrapEmailCodeAuth<T extends PokerAuth>(auth: T, service: EmailCodeService, publicOrigin: string): T {
  const native = auth.handler.bind(auth);
  return { ...auth, handler: async (request: Request) => {
    const url = new URL(request.url);
    let path: string;
    try { path = decodeURIComponent(url.pathname).replace(/\/+$/, ''); } catch { return json({ code: 'INVALID_INPUT' }, 400); }
    const legacy = /^\/api\/auth\/(verify-email|send-verification-email|request-password-reset|forget-password|reset-password)(\/|$)/.test(path);
    if (legacy) {
      if (request.method === 'GET' && /^\/api\/auth\/(verify-email|reset-password)(\/|$)/.test(path)) {
        const target = path.includes('/verify-email') ? '/?recovery=verification&notice=link-replaced' : '/reset-password?notice=link-replaced';
        return new Response(null, { status: 302, headers: { location: `${publicOrigin}${target}`, 'cache-control': 'no-store' } });
      }
      return json({ code: 'LINK_REPLACED', message: 'This link has been replaced. Request a new code.' }, 410);
    }
    const operation = (Object.keys(routes) as Array<keyof typeof routes>).find((key) => routes[key] === path);
    if (path.startsWith('/api/auth/email-otp') && (!operation || path !== url.pathname || request.method !== 'POST')) return json({ code: 'NOT_FOUND' }, 404);
    if (!operation && path !== '/api/auth/sign-up/email') return native(request);
    if (request.method !== 'POST') return native(request);
    if (request.headers.get('origin') !== publicOrigin) return json({ code: 'INVALID_ORIGIN' }, 403);
    const ip = request.headers.get('x-poker-client-ip') || 'unavailable';
    try {
      if (operation) {
        const raw = await readBody(request);
        const parsed = schemas[operation].safeParse(raw);
        if (!parsed.success) throw new EmailCodeError('INVALID_INPUT');
        const data = parsed.data;
        if (operation === 'send') return json(await service.issue(data.email, 'email-verification', ip));
        if (operation === 'request') return json(await service.issue(data.email, 'password-reset', ip));
        if (operation === 'verify' && 'otp' in data && typeof data.otp === 'string') return json(await service.verify(data.email, data.otp, ip));
        if (operation === 'reset' && 'otp' in data && typeof data.otp === 'string' && 'password' in data && typeof data.password === 'string') return json(await service.reset(data.email, data.otp, data.password, ip));
        throw new EmailCodeError('INVALID_INPUT');
      }
      // Signup must commit the provider transaction before challenge issuance.
      const response = await native(request);
      if (response.ok) {
        const data: unknown = await response.clone().json();
        const result = z.object({ user: z.object({ email: z.string(), id: z.string() }) }).safeParse(data);
        if (result.success) await service.issueSignup(result.data.user.email, result.data.user.id, ip);
      }
      response.headers.set('cache-control', 'no-store');
      return response;
    } catch (error) { return failure(error); }
  } };
}
