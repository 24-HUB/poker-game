'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useContext, useEffect } from 'react';

import { readSession, signOut, type SessionState } from '../../lib/auth-client';
import { clearPendingInvitation } from '../rooms/invitation';
import { roomStore } from '../rooms/roomStore';

type SessionContextValue = {
  session: SessionState;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  sessionReader = readSession,
  signOutAction = signOut,
}: {
  children: ReactNode;
  sessionReader?: typeof readSession;
  signOutAction?: typeof signOut;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['session'], queryFn: () => sessionReader() });
  const session = query.data ?? { status: 'loading' };

  useEffect(() => {
    if (session.status === 'authenticated' || session.status === 'unauthenticated') {
      const currentAccountId = session.status === 'authenticated' ? session.account.accountId : null;
      const oldWallets = { queryKey: ['wallet'], predicate: (entry: { queryKey: readonly unknown[] }) => entry.queryKey[1] !== currentAccountId };
      void queryClient.cancelQueries(oldWallets);
      queryClient.removeQueries(oldWallets);
    }
    if (session.status === 'authenticated') roomStore.getState().setAccount(session.account.accountId);
    else if (session.status === 'unauthenticated') roomStore.getState().setAccount(null);
  }, [session, queryClient]);

  const value: SessionContextValue = {
    session,
    refresh: async () => { await query.refetch(); },
    signOut: async () => {
      await signOutAction();
      clearPendingInvitation(sessionStorage);
      roomStore.getState().setAccount(null);
      queryClient.removeQueries({ queryKey: ['wallet'] });
      queryClient.setQueryData(['session'], { status: 'unauthenticated' } satisfies SessionState);
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be rendered inside SessionProvider');
  return value;
}

export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}

export function SessionBoundary({
  children,
  session: suppliedSession,
  onRetry,
}: {
  children: ReactNode;
  session?: SessionState;
  onRetry?: () => void;
}) {
  if (suppliedSession) {
    return <SessionBoundaryView session={suppliedSession} onRetry={onRetry}>{children}</SessionBoundaryView>;
  }
  return <ConnectedSessionBoundary onRetry={onRetry}>{children}</ConnectedSessionBoundary>;
}

function ConnectedSessionBoundary({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  const session = useSession();
  return (
    <SessionBoundaryView session={session.session} onRetry={onRetry ?? (() => void session.refresh())}>
      {children}
    </SessionBoundaryView>
  );
}

function SessionBoundaryView({
  children,
  session,
  onRetry,
}: {
  children: ReactNode;
  session: SessionState;
  onRetry?: () => void;
}) {
  if (session.status === 'authenticated') return children;
  if (session.status === 'loading') return <p className="session-boundary" role="status">Checking private access…</p>;
  if (session.status === 'unavailable') {
    return (
      <div className="session-boundary" role="status">
        <p>The game server is starting.</p>
        <button type="button" onClick={onRetry}>Retry connection</button>
      </div>
    );
  }
  return <p className="session-boundary">Sign in to enter a private room.</p>;
}
