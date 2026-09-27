'use client';

import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '../../components/ui/Icon';
import { readSession, signOut, type SessionState } from '../../lib/auth-client';
import { SignInButton } from './SignInButton';

export function AccountAccess({
  sessionReader = readSession,
  signOutAction = signOut,
}: {
  sessionReader?: typeof readSession;
  signOutAction?: typeof signOut;
}) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = requestSequence.current + 1;
    requestSequence.current = request;
    setSession({ status: 'loading' });
    const next = await sessionReader();
    if (requestSequence.current === request) setSession(next);
  }, [sessionReader]);

  useEffect(() => {
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  if (session.status === 'loading') {
    return <span className="access-badge" role="status">Checking access…</span>;
  }
  if (session.status === 'unavailable') {
    return (
      <span className="access-recovery" role="status">
        <span>Server starting</span>
        <button type="button" onClick={() => void refresh()}><Icon icon={RefreshCw} /> Retry</button>
      </span>
    );
  }
  if (session.status === 'unauthenticated') {
    return <SignInButton onAuthenticated={() => void refresh()} />;
  }
  return (
    <span className="authenticated-access">
      <span className="account-chip" title={session.account.displayName}>
        <Icon icon={UserRound} />
        <span>{session.account.displayName}</span>
      </span>
      <button
        className="sign-out-button"
        type="button"
        onClick={() => {
          void signOutAction()
            .then(() => {
              requestSequence.current += 1;
              setSession({ status: 'unauthenticated' });
            })
            .catch(() => setSession({ status: 'unavailable' }));
        }}
      >
        <Icon icon={LogOut} /> <span>Sign out</span>
      </button>
    </span>
  );
}
