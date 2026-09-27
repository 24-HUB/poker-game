import { createMongoClient } from '../src/database/mongoClientFactory';

describe('MongoDB runtime compatibility', () => {
  it('builds the required driver handshake metadata', async () => {
    const client = createMongoClient('mongodb://127.0.0.1:27019/?directConnection=true');
    const metadata = await (client as unknown as {
      options: { metadata: Promise<unknown> };
    }).options.metadata;

    expect(metadata).toMatchObject({
      driver: { name: 'nodejs', version: '7.6.0' },
    });
  });
});
