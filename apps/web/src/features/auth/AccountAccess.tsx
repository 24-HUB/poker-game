'use client';

import { LogOut, UserRound } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import { readSession, signOut } from '../../lib/auth-client';
import { clearPendingInvitation } from '../rooms/invitation';
import { roomStore } from '../rooms/roomStore';
import { SignInButton } from './SignInButton';
import { useOptionalSession } from './SessionBoundary';
import { WalletSummary } from '../wallet/WalletSummary';
import { useSessionRecovery } from './useSessionRecovery';
import { RecoveryStatus, useRecoveryFocus } from './RecoveryStatus';

export function AccountAccess({
  sessionReader = readSession,
  signOutAction = signOut,
}: {
  sessionReader?: typeof readSession;
  signOutAction?: typeof signOut;
}) {
  const sharedSession = useOptionalSession();
  const fallback = useSessionRecovery(sessionReader, !sharedSession);
  const visibleSession = sharedSession?.session ?? fallback.session;
  const recovery = sharedSession?.recovery ?? fallback.recovery;
  const refreshVisibleSession = sharedSession?.refresh ?? fallback.refresh;
  const focus = useRecoveryFocus(visibleSession);
  if (visibleSession.status === 'unauthenticated') {
    return <span {...focus}><SignInButton onAuthenticated={() => void refreshVisibleSession()} /></span>;
  }
  if (visibleSession.status !== 'authenticated') {
    return <span {...focus}><RecoveryStatus recovery={recovery} onRetry={() => void refreshVisibleSession()} /></span>;
  }
  return (
    <span className="authenticated-access" {...focus}>
      {sharedSession ? <WalletSummary accountId={visibleSession.account.accountId} /> : null}
      <span className="account-chip" title={visibleSession.account.displayName} data-account-control tabIndex={-1}>
        <Icon icon={UserRound} />
        <span>{visibleSession.account.displayName}</span>
      </span>
      <button
        className="sign-out-button"
        type="button"
        onClick={() => {
          void (sharedSession?.signOut() ?? signOutAction())
            .then(() => {
              fallback.setSignedOut();
              clearPendingInvitation(sessionStorage);
              roomStore.getState().setAccount(null);
            })
            .catch(() => { void refreshVisibleSession(); });
        }}
      >
        <Icon icon={LogOut} /> <span>Sign out</span>
      </button>
    </span>
  );
}
