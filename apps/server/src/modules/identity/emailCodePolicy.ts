import { createHmac, randomInt } from 'node:crypto';
import { z } from 'zod';

export type EmailCodePurpose = 'email-verification' | 'password-reset';
export class EmailCodeError extends Error {
  constructor(public readonly code: 'INVALID_CODE' | 'RATE_LIMITED' | 'INVALID_PASSWORD' | 'INVALID_INPUT' | 'SERVICE_UNAVAILABLE',
    public readonly retryAfterSeconds?: number) { super(code); }
}
export function normalizeCodeEmail(email: string): string {
  const parsed = z.email().safeParse(email.trim().toLowerCase());
  if (!parsed.success) throw new EmailCodeError('INVALID_INPUT');
  return parsed.data;
}
export function parseEmailCode(code: string): string {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) throw new EmailCodeError('INVALID_CODE');
  return trimmed;
}
export function generateEmailCode(): string { return randomInt(1_000_000).toString().padStart(6, '0'); }
export function emailCodeHasher(secret: string): (domain: string, value: string) => string {
  const key = createHmac('sha256', secret).update('poker/email-codes/v1').digest();
  return (domain, value) => createHmac('sha256', key).update(JSON.stringify([domain, value])).digest('hex');
}
