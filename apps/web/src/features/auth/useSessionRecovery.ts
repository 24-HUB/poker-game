'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { abortable } from '../../lib/abortable';
import { readSession, type SessionState } from '../../lib/auth-client';

export type RecoveryPhase = 'initial' | 'connecting' | 'exhausted' | 'offline' | 'rate-limited' | 'blocked' | 'idle';
export type SessionRecovery = { phase: RecoveryPhase; busy: boolean; retryDisabled: boolean };

/** One mounted owner; navigation and consumer renders do not restart its budget. */
export function useSessionRecovery(reader: typeof readSession = readSession, enabled = true) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [recovery, setRecovery] = useState<SessionRecovery>({ phase: 'initial', busy: false, retryDisabled: false });
  const readerRef = useRef(reader);
  readerRef.current = reader;
  const actions = useRef({ refresh: async () => {}, setSignedOut: () => {} });

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let generation = 0;
    let windowOpen = true;
    let deadline = 0;
    let attempts = 0;
    let retryAt = 0;
    let phase: RecoveryPhase = 'initial';
    let controller: AbortController | null = null;
    let pending: Promise<void> | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    let cooldownTimer: ReturnType<typeof setTimeout> | undefined;
    const available = () => document.visibilityState !== 'hidden' && navigator.onLine;
    const publish = () => {
      if (!mounted) return;
      setRecovery({
        phase: navigator.onLine ? phase : 'offline', busy: controller !== null,
        retryDisabled: controller !== null || !navigator.onLine || retryAt > Date.now(),
      });
    };
    const cancelRequest = () => {
      generation += 1;
      controller?.abort(); controller = null; pending = null;
      clearTimeout(delayTimer);
    };
    const stop = () => {
      windowOpen = false;
      clearTimeout(delayTimer); clearTimeout(deadlineTimer);
    };
    const exhaust = () => {
      cancelRequest(); stop(); phase = 'exhausted';
      setSession({ status: 'unavailable', reason: 'retryable' }); publish();
    };
    const expired = () => deadline !== 0 && Date.now() >= deadline;

    const check = (): Promise<void> => {
      if (!mounted || !windowOpen) return Promise.resolve();
      if (expired()) { exhaust(); return Promise.resolve(); }
      if (!available()) { publish(); return Promise.resolve(); }
      if (pending) return pending;
      if (attempts >= 18) { exhaust(); return Promise.resolve(); }
      clearTimeout(delayTimer);
      if (deadline === 0) {
        deadline = Date.now() + 90_000;
        deadlineTimer = setTimeout(exhaust, 90_000);
      }
      attempts += 1;
      const requestGeneration = generation;
      const requestController = new AbortController();
      controller = requestController;
      const timeoutMs = Math.min(20_000, deadline - Date.now());
      const requestTimer = setTimeout(() => requestController.abort(), timeoutMs);
      publish();
      pending = (async () => {
        let result: SessionState;
        try {
          result = await abortable(() => readerRef.current(undefined, { signal: requestController.signal, timeoutMs }), requestController.signal);
        } catch {
          result = { status: 'unavailable', reason: 'retryable' };
        } finally { clearTimeout(requestTimer); }
        if (!mounted || generation !== requestGeneration) return;
        controller = null; pending = null;
        if (expired()) { exhaust(); return; }
        setSession(result);
        if (result.status === 'authenticated' || result.status === 'unauthenticated') {
          stop(); phase = 'idle';
        } else if (result.status === 'unavailable' && result.reason === 'rate-limited') {
          stop(); phase = 'rate-limited'; retryAt = result.retryAt ?? Date.now() + 60_000;
          // Long Retry-After values must not overflow setTimeout into an immediate retry.
          const enableRetry = () => {
            if (!mounted) return;
            if (retryAt > Date.now()) cooldownTimer = setTimeout(enableRetry, Math.min(2_147_483_647, retryAt - Date.now()));
            publish();
          };
          enableRetry();
        } else if (result.status === 'unavailable' && result.reason === 'blocked') {
          stop(); phase = 'blocked';
        } else if (attempts >= 18) { exhaust(); return; }
        else { phase = 'connecting'; delayTimer = setTimeout(() => { void check(); }, 5_000); }
        publish();
      })();
      return pending;
    };
    const refresh = (): Promise<void> => {
      if (!mounted || retryAt > Date.now()) return Promise.resolve();
      if (pending) return pending;
      if (!windowOpen) {
        cancelRequest(); clearTimeout(cooldownTimer);
        deadline = 0; attempts = 0; retryAt = 0; windowOpen = true;
        // Keep the Retry control mounted through a user-requested recovery check.
        if (phase === 'idle') { phase = 'initial'; setSession({ status: 'unavailable', reason: 'retryable' }); }
        else phase = 'connecting';
      }
      return check();
    };
    const setSignedOut = () => {
      cancelRequest(); stop(); clearTimeout(cooldownTimer); retryAt = 0; phase = 'idle';
      setSession({ status: 'unauthenticated' }); publish();
    };
    const lifecycle = () => {
      if (!available()) { cancelRequest(); publish(); return; }
      if (windowOpen) void check(); else publish();
    };
    actions.current = { refresh, setSignedOut };
    document.addEventListener('visibilitychange', lifecycle);
    window.addEventListener('online', lifecycle); window.addEventListener('offline', lifecycle);
    // Strict Mode disposes its rehearsal before this first network request.
    queueMicrotask(() => { if (mounted) void check(); });
    publish();
    return () => {
      mounted = false; cancelRequest(); stop(); clearTimeout(cooldownTimer);
      document.removeEventListener('visibilitychange', lifecycle);
      window.removeEventListener('online', lifecycle); window.removeEventListener('offline', lifecycle);
    };
  }, [enabled]);

  const refresh = useCallback(() => actions.current.refresh(), []);
  const setSignedOut = useCallback(() => actions.current.setSignedOut(), []);
  return { session, recovery, refresh, setSignedOut };
}
