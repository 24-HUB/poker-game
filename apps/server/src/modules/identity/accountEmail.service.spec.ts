import { AccountEmailService, accountEmailFromEnvironment } from './accountEmail.service';

const options = {
  apiKey: 'test-api-key', senderEmail: 'club@example.com', senderName: 'Looking Glass Club',
  publicOrigin: 'https://play.example',
};

describe('AccountEmailService', () => {
  it('passes fake delivery to the browser harness through test-only IPC', async () => {
    const previous = process.env.ACCOUNT_EMAIL_TEST_IPC;
    const previousTransport = process.env.ACCOUNT_EMAIL_TRANSPORT;
    const send = jest.fn();
    const previousSend = process.send;
    process.send = send;
    process.env.ACCOUNT_EMAIL_TRANSPORT = 'memory';
    process.env.ACCOUNT_EMAIL_TEST_IPC = 'true';
    try {
      await accountEmailFromEnvironment(options.publicOrigin).sendVerification('friend@example.net', `${options.publicOrigin}/verify`);
      expect(send).toHaveBeenCalledWith({ type: 'account-email', email: { kind: 'verification', recipient: 'friend@example.net', url: `${options.publicOrigin}/verify` } });
    } finally {
      process.send = previousSend;
      if (previous === undefined) delete process.env.ACCOUNT_EMAIL_TEST_IPC;
      else process.env.ACCOUNT_EMAIL_TEST_IPC = previous;
      if (previousTransport === undefined) delete process.env.ACCOUNT_EMAIL_TRANSPORT;
      else process.env.ACCOUNT_EMAIL_TRANSPORT = previousTransport;
    }
  });
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
