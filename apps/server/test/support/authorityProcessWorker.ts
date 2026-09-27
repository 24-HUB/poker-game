import { AuthorityLease } from '../../src/authority/authorityLease';
import { createApplication } from '../../src/main';

async function run(): Promise<void> {
  const application = await createApplication();
  await application.init();
  const authority = application.get(AuthorityLease);
  process.send?.({ type: 'started', ready: authority.isReady() });

  process.once('message', (message: unknown) => {
    if ((message as { type?: string }).type !== 'close') return;
    void application.close().then(() => process.exit(0));
  });
}

void run().catch((error: unknown) => {
  process.send?.({ type: 'error', message: error instanceof Error ? error.message : 'Unknown startup error' });
  process.exit(1);
});
