'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useCallback, useContext, useEffect } from 'react';

import { readSession, signOut, type SessionState } from '../../lib/auth-client';
import { clearPendingInvitation } from '../rooms/invitation';
import { SignInButton } from './SignInButton';
import { roomStore } from '../rooms/roomStore';
import { useSessionRecovery, type SessionRecovery } from './useSessionRecovery';
import { RecoveryStatus, useRecoveryFocus } from './RecoveryStatus';

type SessionContextValue = {
  session: SessionState;
  recovery: SessionRecovery;
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
  const coordinatedReader = useCallback<typeof readSession>(async (_fetcher, options) => {
    const cancel = () => { void queryClient.cancelQueries({ queryKey: ['session'], exact: true }); };
    if (options?.signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
    options?.signal?.addEventListener('abort', cancel, { once: true });
    try {
      // No session query observer: focus/reconnect cannot initiate an extra fetch.
      return await queryClient.fetchQuery({
        queryKey: ['session'], retry: false, staleTime: 0,
        queryFn: ({ signal }) => sessionReader(undefined, { ...options, signal }),
      });
    } finally { options?.signal?.removeEventListener('abort', cancel); }
  }, [queryClient, sessionReader]);
  const coordinator = useSessionRecovery(coordinatedReader);
  const { session } = coordinator;

  useEffect(() => {
    if (session.status !== 'loading') queryClient.setQueryData(['session'], session);
    if (session.status === 'authenticated' || session.status === 'unauthenticated') {
      const currentAccountId = session.status === 'authenticated' ? session.account.accountId : null;
      const oldWallets = { predicate: (entry: { queryKey: readonly unknown[] }) => ['wallet', 'collection', 'equipment', 'current-room', 'hand-history'].includes(String(entry.queryKey[0])) && entry.queryKey[1] !== currentAccountId };
      void queryClient.cancelQueries(oldWallets);
      queryClient.removeQueries(oldWallets);
    }
    if (session.status === 'authenticated') roomStore.getState().setAccount(session.account.accountId);
    else if (session.status === 'unauthenticated') roomStore.getState().setAccount(null);
  }, [session, queryClient]);

  const value: SessionContextValue = {
    session,
    recovery: coordinator.recovery,
    refresh: coordinator.refresh,
    signOut: async () => {
      await signOutAction();
      coordinator.setSignedOut();
      await queryClient.cancelQueries({ queryKey: ['session'], exact: true });
      clearPendingInvitation(sessionStorage);
      roomStore.getState().setAccount(null);
      queryClient.removeQueries({ queryKey: ['wallet'] });
      queryClient.removeQueries({ queryKey: ['collection'] });
      queryClient.removeQueries({ queryKey: ['equipment'] });
      await queryClient.cancelQueries({ queryKey: ['current-room'] });
      queryClient.removeQueries({ queryKey: ['current-room'] });
      await queryClient.cancelQueries({ queryKey: ['hand-history'] });
      queryClient.removeQueries({ queryKey: ['hand-history'] });
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
  heading,
  explanation,
}: {
  heading?: string;
  explanation?: string;
  children: ReactNode;
  session?: SessionState;
  onRetry?: () => void;
}) {
  if (suppliedSession) {
    return <SessionBoundaryView session={suppliedSession} onRetry={onRetry} heading={heading} explanation={explanation}>{children}</SessionBoundaryView>;
  }
  return <ConnectedSessionBoundary onRetry={onRetry} heading={heading} explanation={explanation}>{children}</ConnectedSessionBoundary>;
}

function ConnectedSessionBoundary({ children, onRetry, heading, explanation }: { children: ReactNode; onRetry?: () => void; heading?: string; explanation?: string }) {
  const session = useSession();
  return (
    <SessionBoundaryView session={session.session} recovery={session.recovery} onRetry={onRetry ?? (() => void session.refresh())} heading={heading} explanation={explanation}>
      {children}
    </SessionBoundaryView>
  );
}

function SessionBoundaryView({
  children,
  session,
  onRetry,
  heading,
  explanation,
  recovery,
}: {
  children: ReactNode;
  session: SessionState;
  onRetry?: () => void;
  heading?: string;
  explanation?: string;
  recovery?: SessionRecovery;
}) {
  const focus = useRecoveryFocus<HTMLDivElement>(session);
  if (session.status === 'authenticated') return <div className="session-content" {...focus}>{children}</div>;
  const state = recovery ?? { phase: session.status === 'loading' ? 'initial' : 'exhausted', busy: false, retryDisabled: false };
  return <div className="session-boundary" {...focus}>
    {session.status === 'unauthenticated' ? <section>{heading ? <h1>{heading}</h1> : null}<p>{explanation ?? 'Sign in to enter a private room.'}</p><SignInButton onAuthenticated={onRetry ?? (() => {})} /></section>
      : <RecoveryStatus recovery={state} onRetry={onRetry} />}
  </div>;
}
