import { randomBytes } from 'node:crypto';

// This module belongs only to the disposable loopback harness, never the server application.
export async function prepareLocalMockAccounts({ backendOrigin, publicOrigin, proxySecret, registrationCode, accountEmails }) {
  if (backendOrigin !== 'http://127.0.0.1:3102' || publicOrigin !== 'http://127.0.0.1:3100') throw new Error('Mock accounts require the disposable loopback stack.');
  const headers = { origin: publicOrigin, 'x-poker-proxy-secret': proxySecret, 'content-type': 'application/json' };
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try { if ((await fetch(`${backendOrigin}/api/me`, { headers, signal: AbortSignal.timeout(1000) })).status === 401) { ready = true; break; } } catch { /* bounded native startup */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Local auth did not become ready.');
  const players = {};
  for (const [player, name] of [['host', 'Mock Host'], ['guest', 'Mock Guest']]) {
    const email = `mock-${player}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const signup = await fetch(`${backendOrigin}/api/auth/sign-up/email`, { method: 'POST', headers,
      body: JSON.stringify({ name, email, password, registrationCode }), signal: AbortSignal.timeout(5000) });
    if (!signup.ok) throw new Error('Local mock signup failed.');
    const account = await signup.json();
    let verification;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      verification = accountEmails.findLast((entry) => entry.recipient === email && entry.kind === 'verification');
      if (verification) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!verification) throw new Error('Local verification capture failed.');
    const url = new URL(verification.url);
    if (url.origin !== publicOrigin || url.pathname !== '/api/auth/verify-email') throw new Error('Unexpected local verification target.');
    const verified = await fetch(`${backendOrigin}${url.pathname}${url.search}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(5000) });
    if (verified.status !== 302 && !verified.ok) throw new Error('Local mock verification failed.');
    const signin = await fetch(`${backendOrigin}/api/auth/sign-in/email`, { method: 'POST', headers,
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(5000) });
    if (!signin.ok) throw new Error('Local verified sign-in failed.');
    // Verify the ordinary guarded identity, then discard this preparation session.
    const session = signin.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
    const identity = await fetch(`${backendOrigin}/api/me`, { headers: { ...headers, cookie: session } });
    if (!identity.ok || (await identity.json()).data.accountId !== account.user.id) throw new Error('Local mock identity did not match.');
    await fetch(`${backendOrigin}/api/auth/sign-out`, { method: 'POST', headers: { ...headers, cookie: session } });
    players[player] = { email, password };
  }
  return players;
}
