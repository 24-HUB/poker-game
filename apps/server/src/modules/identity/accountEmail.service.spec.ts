import { AccountEmailService } from './accountEmail.service';

const options = {
  apiKey: 'test-api-key', senderEmail: 'club@example.com', senderName: 'Looking Glass Club',
  publicOrigin: 'https://play.example',
};

describe('AccountEmailService', () => {
  it('sends only provider links on the public origin to the intended recipient', async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const send = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) as unknown });
      return new Response('{}', { status: 201 });
    };
    const service = new AccountEmailService(options, send);

    await service.sendVerification('friend@example.net', 'https://play.example/api/auth/verify-email?token=provider-token');

    expect(requests).toEqual([{
      url: 'https://api.brevo.com/v3/smtp/email',
      body: {
        sender: { email: 'club@example.com', name: 'Looking Glass Club' },
        to: [{ email: 'friend@example.net' }],
        subject: 'Verify your Looking Glass Club email',
        textContent: 'Open this link to verify your email: https://play.example/api/auth/verify-email?token=provider-token',
      },
    }]);
    await expect(service.sendPasswordReset('friend@example.net', 'https://evil.example/reset?token=x'))
      .rejects.toThrow('Account email link has an invalid origin');
    expect(requests).toHaveLength(1);
  });

  it('reports delivery outage without exposing a provider response', async () => {
    const service = new AccountEmailService(options, async () => new Response('private provider error', { status: 503 }));
    await expect(service.sendPasswordReset('friend@example.net', 'https://play.example/reset?token=secret'))
      .rejects.toThrow('Account email delivery is unavailable');
  });
});
