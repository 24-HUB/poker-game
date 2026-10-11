'use client';
import { useEffect, useRef, useState } from 'react';

export function LocalMockAccounts({ onAuthenticated, fetcher = fetch }: { onAuthenticated: () => void; fetcher?: typeof fetch }) {
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    void fetcher('/__e2e/mock-accounts', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => { if (response.ok && (await response.json()).ready === true && active) setReady(true); }).catch(() => {});
    return () => { active = false; };
  }, [fetcher]);
  if (!ready) return null;
  async function enter(player: 'host' | 'guest') {
    if (sending.current) return;
    sending.current = true; setPending(true); setError(null);
    try {
      const response = await fetcher('/__e2e/mock-login', { method: 'POST', cache: 'no-store', credentials: 'include',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player }) });
      if (!response.ok) throw new Error('Local login failed');
      onAuthenticated();
    } catch { setError('The local player could not sign in. Restart the disposable test stack and try again.'); }
    finally { sending.current = false; setPending(false); }
  }
  return <div className="local-mock-accounts">
    <p>Local test players · disposable progress</p>
    <button className="secondary-button" type="button" disabled={pending} onClick={() => void enter('host')}>Play as Mock Host</button>
    <button className="secondary-button" type="button" disabled={pending} onClick={() => void enter('guest')}>Play as Mock Guest</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
