import { z } from 'zod';

const optionsSchema = z.object({
  apiKey: z.string().min(1),
  senderEmail: z.email(),
  senderName: z.string().min(1).max(100),
  publicOrigin: z.url(),
}).strict();

type AccountEmailOptions = z.infer<typeof optionsSchema>;

export const ACCOUNT_EMAIL = Symbol('ACCOUNT_EMAIL');

export class AccountEmailService {
  private readonly options: AccountEmailOptions;

  public constructor(options: AccountEmailOptions, private readonly fetcher: typeof fetch = fetch) {
    this.options = optionsSchema.parse(options);
  }

  public async sendVerification(recipient: string, url: string): Promise<void> {
    await this.send(recipient, url, 'Verify your Looking Glass Club email',
      'Open this link to verify your email');
  }

  public async sendPasswordReset(recipient: string, url: string): Promise<void> {
    await this.send(recipient, url, 'Reset your Looking Glass Club password',
      'Open this link to reset your password');
  }

  private async send(recipient: string, rawUrl: string, subject: string, instruction: string): Promise<void> {
    const address = z.email().parse(recipient);
    let url: URL;
    try { url = new URL(rawUrl); }
    catch { throw new Error('Account email link has an invalid origin'); }
    if (url.origin !== new URL(this.options.publicOrigin).origin || url.username || url.password) {
      throw new Error('Account email link has an invalid origin');
    }
    try {
      const response = await this.fetcher('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': this.options.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: this.options.senderEmail, name: this.options.senderName },
          to: [{ email: address }], subject,
          textContent: `${instruction}: ${url.toString()}`,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error('Delivery rejected');
    } catch {
      throw new Error('Account email delivery is unavailable');
    }
  }
}

export function accountEmailFromEnvironment(publicOrigin: string): AccountEmailService {
  return new AccountEmailService({
    apiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? '',
    senderName: process.env.BREVO_SENDER_NAME ?? 'Looking Glass Club',
    publicOrigin,
  });
}
