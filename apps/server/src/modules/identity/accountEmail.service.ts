import { z } from 'zod';

const optionsSchema = z.object({
  apiKey: z.string().min(1),
  senderEmail: z.email(),
  senderName: z.string().min(1).max(100),
  publicOrigin: z.url(),
}).strict();

type AccountEmailOptions = z.infer<typeof optionsSchema>;

export const ACCOUNT_EMAIL = Symbol('ACCOUNT_EMAIL');
export type AccountEmailDelivery = Pick<AccountEmailService, 'sendVerification' | 'sendPasswordReset'>;
export const testAccountEmailInbox: Array<{ kind: 'verification' | 'reset'; recipient: string; code: string }> = [];

export class AccountEmailService {
  private readonly options: AccountEmailOptions;

  public constructor(options: AccountEmailOptions, private readonly fetcher: typeof fetch = fetch) {
    this.options = optionsSchema.parse(options);
  }

  public async sendVerification(recipient: string, code: string): Promise<void> {
    await this.send(recipient, code, 'Verify your email', 'Your verification code is');
  }

  public async sendPasswordReset(recipient: string, code: string): Promise<void> {
    await this.send(recipient, code, 'Reset your password', 'Your password reset code is');
  }

  private async send(recipient: string, code: string, subject: string, instruction: string): Promise<void> {
    const address = z.email().parse(recipient);
    if (!/^\d{6}$/.test(code)) throw new Error('Invalid account email code');
    try {
      const response = await this.fetcher('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': this.options.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: this.options.senderEmail, name: this.options.senderName },
          to: [{ email: address }], subject,
          textContent: `${instruction}:\n\n${code}\n\nIt expires in 10 minutes. Use the latest code. Do not share it.`,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error('Delivery rejected');
    } catch {
      throw new Error('Account email delivery is unavailable');
    }
  }
}

export function accountEmailFromEnvironment(publicOrigin: string): AccountEmailDelivery {
  if (process.env.ACCOUNT_EMAIL_TRANSPORT === 'memory') {
    if (process.env.NODE_ENV !== 'test') throw new Error('Memory account email is test-only');
    const deliver = (email: typeof testAccountEmailInbox[number]) => {
      if (process.env.ACCOUNT_EMAIL_FAIL_TEST === 'true') throw new Error('Account email delivery is unavailable');
      testAccountEmailInbox.push(email);
      if (process.env.ACCOUNT_EMAIL_TEST_IPC === 'true') process.send?.({ type: 'account-email', email });
    };
    return {
      async sendVerification(recipient, code) {
        deliver({ kind: 'verification', recipient, code });
      },
      async sendPasswordReset(recipient, code) {
        deliver({ kind: 'reset', recipient, code });
      },
    };
  }
  return new AccountEmailService({
    apiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? '',
    senderName: process.env.BREVO_SENDER_NAME ?? 'Looking Glass Club',
    publicOrigin,
  });
}
