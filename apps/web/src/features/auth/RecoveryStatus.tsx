'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { SessionState } from '../../lib/auth-client';
import type { SessionRecovery } from './useSessionRecovery';

const messages = {
  initial: 'Checking access…', connecting: 'Connecting to server…',
  exhausted: 'Server unavailable. Please try again.', offline: 'You’re offline. Reconnect to continue.',
  'rate-limited': 'Too many requests. Please wait before retrying.',
  blocked: 'Unable to connect. Please try again.', idle: 'Checking access…',
};

export function RecoveryStatus({ recovery, onRetry }: { recovery: SessionRecovery; onRetry?: () => void }) {
  return <span className="access-recovery">
    <span className="access-recovery__copy" role="status" aria-live="polite">
      <span>{messages[recovery.phase]}</span>
      {recovery.phase === 'connecting' ? <small>The server may be waking up. This can take about a minute.</small> : null}
    </span>
    {recovery.phase !== 'initial' && recovery.phase !== 'idle' ?
      <button type="button" data-session-retry disabled={recovery.retryDisabled} onClick={onRetry}><Icon icon={RefreshCw} /> Retry</button> : null}
  </span>;
}

/** Only restore focus when the user was on the disappearing recovery control. */
export function useRecoveryFocus<T extends HTMLElement = HTMLSpanElement>(session: SessionState) {
  const ref = useRef<T>(null);
  const focusedRetry = useRef(false);
  useEffect(() => {
    const focusChanged = (event: FocusEvent) => {
      const target = event.target;
      focusedRetry.current = target instanceof HTMLElement && Boolean(ref.current?.contains(target)) && target.hasAttribute('data-session-retry');
    };
    document.addEventListener('focusin', focusChanged);
    return () => document.removeEventListener('focusin', focusChanged);
  }, []);
  useLayoutEffect(() => {
    if ((session.status === 'authenticated' || session.status === 'unauthenticated') && focusedRetry.current) {
      focusedRetry.current = false;
      const replacement = session.status === 'authenticated'
        ? document.querySelector<HTMLElement>('[data-account-control]')
        : ref.current?.querySelector<HTMLElement>('button');
      replacement?.focus();
    }
  }, [session]);
  return {
    ref,
    onFocusCapture: (event: React.FocusEvent) => { focusedRetry.current = (event.target as HTMLElement).hasAttribute('data-session-retry'); },
    onBlurCapture: (event: React.FocusEvent) => {
      const target = event.target as HTMLButtonElement;
      // Chromium blurs a focused button when it becomes disabled. Remember it
      // until recovery, unless a subsequent focusin shows the user moved elsewhere.
      if (event.relatedTarget === null && target.hasAttribute('data-session-retry') && (target.disabled || !target.isConnected)) return;
      focusedRetry.current = false;
    },
  };
}
