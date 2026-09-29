import { Inject, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';

import { AUTH, type PokerAuth } from './auth';

export type VerifiedIdentity = {
  accountId: string;
  sessionId: string;
  expiresAt: Date;
};

export type VerifiedAccountIdentity = VerifiedIdentity & { displayName: string };

@Injectable()
export class IdentityService {
  public constructor(@Inject(AUTH) private readonly auth: PokerAuth) {}

  public async resolve(headers: Headers): Promise<VerifiedAccountIdentity | null> {
    const resolved = await this.auth.api.getSession({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    });
    if (!resolved) return null;

    return {
      accountId: resolved.user.id,
      sessionId: resolved.session.id,
      expiresAt: new Date(resolved.session.expiresAt),
      displayName: resolved.user.name,
    };
  }
}

export function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === 'string') result.set(name, value);
    else if (Array.isArray(value)) result.set(name, value.join(', '));
  }
  return result;
}
