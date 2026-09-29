export type AccountIdentity = { accountId: string; displayName: string };

export type SessionState =
  | { status: 'loading' }
  | { status: 'authenticated'; account: AccountIdentity }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

export type SignInInput = { email: string; password: string };
export type SignUpInput = SignInInput & { name: string; registrationCode: string };
export type Fetcher = typeof fetch;

export class AuthRequestError extends Error {
  public constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export async function readSession(fetcher: Fetcher = fetch): Promise<SessionState> {
  try {
    const response = await fetcher('/api/me', {
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (response.status === 401) return { status: 'unauthenticated' };
    if (!response.ok) return { status: 'unavailable' };

    const body: unknown = await response.json();
    if (!isIdentityEnvelope(body)) return { status: 'unavailable' };
    return { status: 'authenticated', account: body.data };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function signIn(input: SignInInput, fetcher: Fetcher = fetch): Promise<void> {
  await submitAuth('/api/auth/sign-in/email', input, fetcher);
}

export async function signUp(input: SignUpInput, fetcher: Fetcher = fetch): Promise<void> {
  await submitAuth('/api/auth/sign-up/email', input, fetcher);
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
    throw new AuthRequestError('INVALID_REGISTRATION_CODE', 'That registration code is not valid.');
  }
  if (response.status === 422) {
    throw new AuthRequestError(providerError.code, providerError.message);
  }
  throw new AuthRequestError('SERVICE_UNAVAILABLE', 'The server could not complete sign-in. Try again shortly.');
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
