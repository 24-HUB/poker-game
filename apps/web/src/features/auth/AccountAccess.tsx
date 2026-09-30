'use client';

import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '../../components/ui/Icon';
import { readSession, signOut, type SessionState } from '../../lib/auth-client';
import { clearPendingInvitation } from '../rooms/invitation';
import { roomStore } from '../rooms/roomStore';
import { SignInButton } from './SignInButton';
import { useOptionalSession } from './SessionBoundary';
import { WalletSummary } from '../wallet/WalletSummary';

export function AccountAccess({
  sessionReader = readSession,
  signOutAction = signOut,
}: {
  sessionReader?: typeof readSession;
  signOutAction?: typeof signOut;
}) {
  const sharedSession = useOptionalSession();
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
    if (sharedSession) return;
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh, sharedSession]);

  const visibleSession = sharedSession?.session ?? session;
  const refreshVisibleSession = sharedSession?.refresh ?? refresh;

  if (visibleSession.status === 'loading') {
    return <span className="access-badge" role="status">Checking access…</span>;
  }
  if (visibleSession.status === 'unavailable') {
    return (
      <span className="access-recovery" role="status">
        <span>Server starting</span>
        <button type="button" onClick={() => void refreshVisibleSession()}><Icon icon={RefreshCw} /> Retry</button>
      </span>
    );
  }
  if (visibleSession.status === 'unauthenticated') {
    return <SignInButton onAuthenticated={() => void refreshVisibleSession()} />;
  }
  return (
    <span className="authenticated-access">
      {sharedSession ? <WalletSummary accountId={visibleSession.account.accountId} /> : null}
      <span className="account-chip" title={visibleSession.account.displayName}>
        <Icon icon={UserRound} />
        <span>{visibleSession.account.displayName}</span>
      </span>
      <button
        className="sign-out-button"
        type="button"
        onClick={() => {
          void (sharedSession?.signOut() ?? signOutAction())
            .then(() => {
              requestSequence.current += 1;
              clearPendingInvitation(sessionStorage);
              roomStore.getState().setAccount(null);
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
