import { fork, type ChildProcess } from 'node:child_process';
import path from 'node:path';

export type AuthorityProcess = {
  ready: boolean;
  close: () => Promise<void>;
};

type WorkerMessage =
  | { type: 'started'; ready: boolean }
  | { type: 'error'; message: string };

export async function startAuthorityProcess(mongoUri: string, databaseName: string): Promise<AuthorityProcess> {
  const workerPath = path.join(__dirname, 'authorityProcessWorker.ts');
  const child = fork(workerPath, [], {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, MONGODB_URI: mongoUri, MONGODB_DATABASE: databaseName },
    execArgv: ['-r', require.resolve('ts-node/register/transpile-only')],
    silent: true,
  });

  const ready = await waitForStartup(child);
  return { ready, close: () => closeWorker(child) };
}

async function waitForStartup(child: ChildProcess): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Authority process startup timed out')), 10_000);
    const finish = (callback: () => void): void => {
      clearTimeout(timeout);
      child.off('error', onError);
      child.off('exit', onExit);
      child.off('message', onMessage);
      callback();
    };
    const onError = (error: Error): void => finish(() => reject(error));
    const onExit = (code: number | null): void => finish(() => reject(new Error(`Authority process exited during startup (${code ?? 'signal'})`)));
    const onMessage = (value: unknown): void => {
      const message = value as WorkerMessage;
      if (message.type === 'started') finish(() => resolve(message.ready));
      else if (message.type === 'error') finish(() => reject(new Error(message.message)));
    };
    child.once('error', onError);
    child.once('exit', onExit);
    child.on('message', onMessage);
  });
}

async function closeWorker(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      child.kill();
      resolve();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.send({ type: 'close' });
  });
}
