const timeoutMs = readTimeout(process.env.SMOKE_TIMEOUT_MS);

class SmokeError extends Error {}

try {
  const publicOrigin = readPublicOrigin(process.env.PUBLIC_ORIGIN);
  const shell = await fetch(new URL('/', publicOrigin), {
    headers: { accept: 'text/html' },
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (shell.status !== 200) throw new SmokeError(`public shell returned ${shell.status}`);
  console.log(`shell: ${shell.status}`);

  const readiness = await fetch(new URL('/api/health/ready', publicOrigin), {
    headers: { accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await readJson(readiness);
  if (readiness.status === 200 && body?.status === 'ready') {
    console.log('readiness: ready');
  } else if (readiness.status === 503 && body?.status === 'standby') {
    console.log('readiness: standby');
    throw new SmokeError('backend is healthy but does not own authority');
  } else {
    throw new SmokeError(`readiness returned an unexpected ${readiness.status} response`);
  }
} catch (error) {
  const message = error instanceof SmokeError ? error.message : 'public origin is unavailable';
  console.error(`Deployment smoke failed: ${message}.`);
  process.exitCode = 1;
}

function readPublicOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new SmokeError('PUBLIC_ORIGIN must be a valid origin');
  }
  const loopbackHttp = origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname);
  if ((!loopbackHttp && origin.protocol !== 'https:') || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new SmokeError('PUBLIC_ORIGIN must be an HTTPS origin (loopback HTTP is allowed for local checks)');
  }
  return origin;
}

function readTimeout(value) {
  const parsed = Number(value ?? 15_000);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 100), 60_000) : 15_000;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new SmokeError('readiness did not return JSON');
  }
}
