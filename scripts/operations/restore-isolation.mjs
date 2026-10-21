import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const containerId = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

export function verifyRestoreIsolation({ mongo, runner, probes } = {}) {
  const violations = new Set();
  if (!mongo || mongo.HostConfig?.NetworkMode !== 'none'
    || runner && ![`container:${mongo.Id}`, `container:${mongo.Name?.replace(/^\//, '')}`].includes(runner.HostConfig?.NetworkMode)) violations.add('NETWORK_MODE');
  for (const container of [mongo, runner].filter(Boolean)) {
    const host = container.HostConfig ?? {};
    if (Object.keys(host.PortBindings ?? {}).length || host.PublishAllPorts
      || Object.values(container.NetworkSettings?.Ports ?? {}).some(Boolean)) violations.add('PUBLISHED_PORT');
    if (host.Privileged || host.CapAdd?.length || host.Devices?.length || host.PidMode === 'host') violations.add('HOST_MOUNT');
    const allowed = new Set(['/data/db', '/data/configdb', '/tmp']);
    if ((container.Mounts ?? []).some((mount) => mount.Type !== 'tmpfs' || !allowed.has(mount.Destination))) violations.add('HOST_MOUNT');
    const forbidden = /^(MONGODB_|BREVO_|BETTER_AUTH_|PROXY_SECRET|PUBLIC_ORIGIN|AWS_|CLOUDFLARE_|ATLAS_|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY)/i;
    if ((container.Config?.Env ?? []).some((entry) => forbidden.test(entry))) violations.add('SOURCE_CONFIG');
  }
  if (probes?.defaultRoute !== false) violations.add('DEFAULT_ROUTE');
  if (probes?.egressDenied !== true) violations.add('EGRESS_ALLOWED');
  return { ok: !violations.size, violations: [...violations] };
}

// Read actual namespace routes and attempt external TCP, without DNS or secrets.
// No supplied probe values or inspection JSON is accepted by the operator CLI.
export async function inspectRestoreIsolation(mongoName, runnerName) {
  if (![mongoName, runnerName].filter(Boolean).every((name) => containerId.test(name))) throw new Error('ISOLATION_FAILED');
  const inspect = async (name) => JSON.parse((await run('docker', ['inspect', name], { timeout: 10000 })).stdout)[0];
  const mongo = await inspect(mongoName);
  const runner = runnerName ? await inspect(runnerName) : undefined;
  const routes = (await run('docker', ['exec', mongoName, 'cat', '/proc/net/route'], { timeout: 10000 })).stdout;
  const ipv6 = (await run('docker', ['exec', mongoName, 'cat', '/proc/net/ipv6_route'], { timeout: 10000 })).stdout;
  const defaultRoute = routes.split('\n').slice(1).some((line) => line.trim().split(/\s+/)[1] === '00000000')
    || ipv6.split('\n').some((line) => /^0{32} 00 /.test(line) && !line.endsWith(' lo'));
  let egressDenied = false;
  try {
    const probe = await run('docker', ['exec', mongoName, 'bash', '-c', 'timeout 2 bash -c "exec 3<>/dev/tcp/1.1.1.1/443" >/dev/null 2>&1; test $? -ne 0'], { timeout: 5000 });
    egressDenied = probe.stdout === '';
  } catch { /* fail closed if the probe itself cannot execute */ }
  return { mongo, runner, probes: { defaultRoute, egressDenied } };
}
