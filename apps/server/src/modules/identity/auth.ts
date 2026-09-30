import { createHash, timingSafeEqual } from 'node:crypto';

import type { Db, MongoClient } from 'mongodb';

import { parsePublicOrigin } from '../../common/proxyGuard';
import {
  loadBetterAuth,
  loadBetterAuthApi,
  loadBetterAuthMongoAdapter,
} from '../../compatibility/better-auth-loader';
import { accountEmailFromEnvironment } from './accountEmail.service';

export const AUTH = Symbol('AUTH');

export type PokerAuth = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (input: {
      headers: Headers;
      query: { disableCookieCache: boolean; disableRefresh: boolean };
    }) => Promise<{
      session: { id: string; expiresAt: Date };
      user: { id: string; name: string; emailVerified: boolean };
    } | null>;
  };
};

export async function createPokerAuth(db: Db, client: MongoClient): Promise<PokerAuth> {
  const publicOrigin = requirePublicOrigin();
  const secureCookies = new URL(publicOrigin).protocol === 'https:';
  const secret = requireEnvironmentValue('BETTER_AUTH_SECRET');
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');

  const expectedInviteDigest = parseInviteDigest(requireEnvironmentValue('REGISTRATION_INVITE_CODE_SHA256'));
  const accountEmail = accountEmailFromEnvironment(publicOrigin);
  const enforceRecovery = recoveryEnforced();
  const { betterAuth } = await loadBetterAuth();
  const { createAuthMiddleware, APIError } = await loadBetterAuthApi();
  const { mongodbAdapter } = await loadBetterAuthMongoAdapter();

  return betterAuth({
    appName: 'Poker Anime Gacha',
    baseURL: publicOrigin,
    secret,
    trustedOrigins: [publicOrigin],
    database: mongodbAdapter(db, { client, transaction: true }),
    rateLimit: {
      enabled: enforceRecovery, storage: 'database',
      // Browser fixtures share one loopback IP. Production retains provider defaults.
      ...(process.env.NODE_ENV === 'test' && process.env.ACCOUNT_EMAIL_TEST_IPC === 'true'
        ? { customRules: { '/sign-up/email': { window: 10, max: 100 }, '/sign-in/email': { window: 10, max: 100 } } } : {}),
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: enforceRecovery,
      autoSignIn: !enforceRecovery,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, url }) => accountEmail.sendPasswordReset(user.email, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => accountEmail.sendVerification(user.email, url),
    },
    session: { cookieCache: { enabled: false } },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-poker-client-ip'] },
      useSecureCookies: secureCookies,
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'lax',
        path: '/',
      },
    },
    logger: { disabled: true },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        const redirectField = context.path === '/request-password-reset' ? 'redirectTo'
          : ['/send-verification-email', '/sign-up/email', '/sign-in/email'].includes(context.path) ? 'callbackURL' : null;
        const redirect = redirectField ? context.body?.[redirectField] : undefined;
        if (redirect !== undefined && !isPublicRedirect(redirect, publicOrigin)) {
          throw APIError.from('BAD_REQUEST', { code: 'INVALID_REDIRECT', message: 'The recovery redirect is invalid.' });
        }
        if (context.path !== '/sign-up/email') return;

        const submittedCode = context.body?.registrationCode;
        if (typeof submittedCode !== 'string' || !inviteCodeMatches(submittedCode, expectedInviteDigest)) {
          throw APIError.from('FORBIDDEN', {
            code: 'INVALID_REGISTRATION_CODE',
            message: 'The registration code is invalid.',
          });
        }

        delete context.body.registrationCode;
      }),
    },
  });
}

export function recoveryEnforced(): boolean {
  return process.env.NODE_ENV !== 'test' || process.env.ACCOUNT_RECOVERY_ENFORCED === 'true';
}

function isPublicRedirect(value: unknown, publicOrigin: string): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value, publicOrigin);
    return url.origin === new URL(publicOrigin).origin && !url.username && !url.password;
  } catch { return false; }
}

function inviteCodeMatches(code: string, expectedDigest: Buffer): boolean {
  const actualDigest = createHash('sha256').update(code).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function parseInviteDigest(value: string): Buffer {
  if (!/^[a-f\d]{64}$/i.test(value)) {
    throw new Error('REGISTRATION_INVITE_CODE_SHA256 must be a 64-character SHA-256 hex digest');
  }
  return Buffer.from(value, 'hex');
}

function requireEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requirePublicOrigin(): string {
  const value = requireEnvironmentValue('PUBLIC_ORIGIN');
  if (!parsePublicOrigin(value)) {
    throw new Error('PUBLIC_ORIGIN must be an HTTPS origin, or a loopback HTTP origin outside production');
  }
  return value;
}
