import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';

import { MongoClient } from 'mongodb';

const run = promisify(execFile);

test('initializes a fresh published replica set that host clients can reach', async () => {
  const port = await unusedLoopbackPort();
  const container = `poker-rs-init-${randomUUID()}`;
  const uri = `mongodb://127.0.0.1:${port}/?directConnection=true`;

  await run('docker', [
    'run', '--rm', '-d', '--name', container,
    '--publish', `127.0.0.1:${port}:${port}`,
    'mongo:8.0.17', 'mongod', '--replSet', 'rs0', '--bind_ip_all', '--port', String(port),
  ], { timeout: 30_000 });

  try {
    await waitForMongo(uri);
    await run(process.execPath, ['scripts/init-replica-set.mjs'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, MONGODB_BOOTSTRAP_URI: uri },
      timeout: 30_000,
    });

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2_000 });
    try {
      await client.connect();
      await waitForPrimary(client);
      const status = await client.db('admin').command({ replSetGetStatus: 1 });
      assert.equal(status.members.length, 1);
      assert.equal(status.members[0].name, `127.0.0.1:${port}`);
    } finally {
      await client.close();
    }
  } finally {
    await run('docker', ['rm', '-f', container], { timeout: 15_000 });
  }
});

async function unusedLoopbackPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForMongo(uri) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1_000 });
    try {
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      await client.close();
    }
  }
  throw new Error('Disposable MongoDB did not start');
}

async function waitForPrimary(client) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const status = await client.db('admin').command({ replSetGetStatus: 1 });
    if (status.myState === 1) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Disposable replica set did not elect a primary');
}
