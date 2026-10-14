import { abortable } from './abortable';

export type AccountIdentity = { accountId: string; displayName: string };

export type SessionState =
  | { status: 'loading' }
  | { status: 'authenticated'; account: AccountIdentity }
  | { status: 'unauthenticated' }
  | { status: 'unavailable'; reason?: 'retryable' | 'rate-limited' | 'blocked'; retryAt?: number };

export type SignInInput = { email: string; password: string };
export type SignUpInput = SignInInput & { name: string; registrationCode: string };
export type Fetcher = typeof fetch;

export class AuthRequestError extends Error {
  public constructor(public readonly code: string, message: string, public readonly retryAfterSeconds?: number) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export type SessionReadOptions = { signal?: AbortSignal; timeoutMs?: number };

export async function readSession(fetcher: Fetcher = fetch, options: SessionReadOptions = {}): Promise<SessionState> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(cancel, Math.max(0, Math.min(20_000, options.timeoutMs ?? 20_000)));
  try {
    return await abortable(async () => {
      const response = await fetcher('/api/me', {
        credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      if (response.status === 401) return { status: 'unauthenticated' };
      if (response.status === 429) {
        return { status: 'unavailable', reason: 'rate-limited', retryAt: retryAfter(response.headers.get('retry-after')) };
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        return { status: 'unavailable', reason: 'blocked' };
      }
      if (response.status !== 200) return { status: 'unavailable', reason: 'retryable' };
      const body: unknown = await response.json();
      if (!isIdentityEnvelope(body)) return { status: 'unavailable', reason: 'retryable' };
      return { status: 'authenticated', account: body.data };
    }, controller.signal);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return { status: 'unavailable', reason: 'retryable' };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

function retryAfter(header: string | null): number {
  const now = Date.now();
  if (header !== null && /^\d+$/.test(header.trim())) {
    const delay = Number(header) * 1_000;
    if (Number.isFinite(delay) && Number.isSafeInteger(now + delay)) return now + delay;
  }
  if (header !== null && /^[A-Za-z]{3}, /.test(header)) {
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(now, date);
  }
  return now + 60_000;
}

export async function signIn(input: SignInInput, fetcher: Fetcher = fetch): Promise<void> {
  await submitAuth('/api/auth/sign-in/email', input, fetcher);
}

export async function signUp(input: SignUpInput, fetcher: Fetcher = fetch): Promise<void> {
  await submitAuth('/api/auth/sign-up/email', input, fetcher);
}

export async function requestPasswordReset(email: string, fetcher: Fetcher = fetch): Promise<void> {
  await submitRecovery('/api/auth/email-otp/request-password-reset', { email }, fetcher);
}

export async function resendVerification(email: string, fetcher: Fetcher = fetch): Promise<void> {
  await submitRecovery('/api/auth/email-otp/send-verification-otp', { email, type: 'email-verification' }, fetcher);
}

export async function verifyEmail(email: string, otp: string, fetcher: Fetcher = fetch): Promise<void> {
  await submitRecovery('/api/auth/email-otp/verify-email', { email, otp: otp.trim() }, fetcher);
}

export async function resetPassword(email: string, otp: string, password: string, fetcher: Fetcher = fetch): Promise<void> {
  await submitRecovery('/api/auth/email-otp/reset-password', { email, otp: otp.trim(), password }, fetcher);
}

export async function signOut(fetcher: Fetcher = fetch): Promise<void> {
  try {
    const response = await fetcher('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Sign-out rejected');
  } catch {
    throw new AuthRequestError('SERVICE_UNAVAILABLE', 'The server could not confirm sign-out. Try again shortly.');
  }
}

async function submitAuth(path: string, input: SignInInput | SignUpInput, fetcher: Fetcher): Promise<void> {
  let response: Response;
  try {
    response = await fetcher(path, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AuthRequestError('SERVICE_UNAVAILABLE', 'The server is still starting. Try again shortly.');
  }

  if (response.ok) return;
  const providerError = await readProviderError(response);
  if (response.status === 401) {
    throw new AuthRequestError('INVALID_CREDENTIALS', 'That email and password did not match.');
  }
  if (response.status === 403) {
    if (providerError.code === 'EMAIL_NOT_VERIFIED') {
      throw new AuthRequestError('EMAIL_NOT_VERIFIED', 'Verify your email before signing in. Enter your code or request a new one.');
    }
    if (path === '/api/auth/sign-up/email' && providerError.code === 'INVALID_REGISTRATION_CODE') {
      throw new AuthRequestError('INVALID_REGISTRATION_CODE', 'That registration code is not valid.');
    }
    throw new AuthRequestError('FORBIDDEN', 'Sign-in was blocked. Open the trusted app address and try again.');
  }
  if (response.status === 422) {
    throw new AuthRequestError(providerError.code, providerError.message);
  }
  if (response.status === 429) throw new AuthRequestError('RATE_LIMITED', 'Please wait a minute before trying again.');
  throw new AuthRequestError('SERVICE_UNAVAILABLE', 'The server could not complete sign-in. Try again shortly.');
}

async function submitRecovery(path: string, input: object, fetcher: Fetcher): Promise<void> {
  let response: Response;
  try {
    response = await fetcher(path, {
      method: 'POST', credentials: 'include', cache: 'no-store',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AuthRequestError('SERVICE_UNAVAILABLE', path.endsWith('/reset-password')
      ? 'The server could not confirm the password change. Try signing in with your intended password, or request a fresh code.'
      : 'The server is unavailable. Try again shortly.');
  }
  if (response.ok) return;
  if (response.status === 429) {
    const seconds = Number(response.headers.get('retry-after'));
    throw new AuthRequestError('RATE_LIMITED', 'Please wait before trying again.', Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60);
  }
  const provider = await readProviderError(response);
  if (response.status === 400 && provider.code === 'INVALID_CODE') throw new AuthRequestError('INVALID_CODE', 'This code is invalid, expired, replaced or exhausted. Request a new code.');
  if (response.status === 400 && provider.code === 'INVALID_PASSWORD') throw new AuthRequestError('INVALID_PASSWORD', 'Use a password with 8–128 characters.');
  if (response.status === 400) throw new AuthRequestError('INVALID_INPUT', 'Check the email and six-digit code, then try again.');
  if (response.status === 403) throw new AuthRequestError('FORBIDDEN', 'Open the trusted app address and try again.');
  throw new AuthRequestError('SERVICE_UNAVAILABLE', path.endsWith('/reset-password')
    ? 'The server could not confirm the password change. Try signing in with your intended password, or request a fresh code.'
    : 'The request could not be confirmed. Try again shortly.');
}

async function readProviderError(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body)) {
      return {
        code: typeof body.code === 'string' ? body.code : 'INVALID_ACCOUNT_DETAILS',
        message: typeof body.message === 'string' ? body.message : 'Check the account details and try again.',
      };
    }
  } catch {
    // A provider error body is optional; use safe copy below.
  }
  return { code: 'INVALID_ACCOUNT_DETAILS', message: 'Check the account details and try again.' };
}

function isIdentityEnvelope(value: unknown): value is { data: AccountIdentity; error: null } {
  if (!isRecord(value) || value.error !== null || !isRecord(value.data)) return false;
  return typeof value.data.accountId === 'string' && typeof value.data.displayName === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
