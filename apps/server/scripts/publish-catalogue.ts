import { createMongoClient } from '../src/database/mongoClientFactory';
import { CELESTIAL_BANNER, publishCatalogue } from '../src/modules/gacha/catalogue';

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const database = process.env.MONGODB_DATABASE;
  if (!uri || !database) throw new Error('Explicit MONGODB_URI and MONGODB_DATABASE are required');
  const client = createMongoClient(uri);
  try {
    await client.connect();
    await publishCatalogue(client.db(database), CELESTIAL_BANNER);
    console.log(`Published immutable catalogue ${CELESTIAL_BANNER.version}`);
  } finally { await client.close(); }
}
void run().catch(() => { console.error('Catalogue publication failed; inspect configuration and immutable version.'); process.exitCode = 1; });
