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
      await accountEmailFromEnvironment(options.publicOrigin).sendVerification('friend@example.net', '000042');
      expect(send).toHaveBeenCalledWith({ type: 'account-email', email: { kind: 'verification', recipient: 'friend@example.net', code: '000042' } });
    } finally {
      process.send = previousSend;
      if (previous === undefined) delete process.env.ACCOUNT_EMAIL_TEST_IPC;
      else process.env.ACCOUNT_EMAIL_TEST_IPC = previous;
      if (previousTransport === undefined) delete process.env.ACCOUNT_EMAIL_TRANSPORT;
      else process.env.ACCOUNT_EMAIL_TRANSPORT = previousTransport;
    }
  });
  it('sends a six-digit code with expiry and no recovery link to the intended recipient', async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const send = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) as unknown });
      return new Response('{}', { status: 201 });
    };
    const service = new AccountEmailService(options, send);

    await service.sendVerification('friend@example.net', '000042');

    expect(requests).toEqual([{
      url: 'https://api.brevo.com/v3/smtp/email',
      body: {
        sender: { email: 'club@example.com', name: 'Looking Glass Club' },
        to: [{ email: 'friend@example.net' }],
        subject: 'Verify your email',
        textContent: 'Your verification code is:\n\n000042\n\nIt expires in 10 minutes. Use the latest code. Do not share it.',
      },
    }]);
    await expect(service.sendPasswordReset('friend@example.net', 'https://evil.example/reset?token=x'))
      .rejects.toThrow();
    expect(requests).toHaveLength(1);
  });

  it('reports delivery outage without exposing a provider response', async () => {
    const service = new AccountEmailService(options, async () => new Response('private provider error', { status: 503 }));
    await expect(service.sendPasswordReset('friend@example.net', '000043'))
      .rejects.toThrow('Account email delivery is unavailable');
  });
});
