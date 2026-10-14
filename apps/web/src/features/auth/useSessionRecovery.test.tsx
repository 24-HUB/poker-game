// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readSession, type SessionState } from '../../lib/auth-client';
import { useSessionRecovery } from './useSessionRecovery';

const unavailable: SessionState = { status: 'unavailable' };
const signedOut: SessionState = { status: 'unauthenticated' };
const authenticated: SessionState = { status: 'authenticated', account: { accountId: 'a', displayName: 'Alice' } };
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function visibility(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}
function online(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
  act(() => window.dispatchEvent(new Event(value ? 'online' : 'offline')));
}
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('session recovery', () => {
  it('rejects an authoritative response at the wall-clock deadline after browser suspension', async () => {
    let finish!: (session: SessionState) => void;
    const reader = vi.fn(() => new Promise<SessionState>((resolve) => { finish = resolve; }));
    const view = renderHook(() => useSessionRecovery(reader)); await advance();
    vi.setSystemTime(Date.now() + 90_000);
    await act(async () => finish(authenticated));
    expect(view.result.current.session.status).toBe('unavailable');
    expect(view.result.current.recovery.phase).toBe('exhausted');
  });
  it.each([signedOut, authenticated])('recovers automatically and stops after an authoritative $status', async (final) => {
    const reader = vi.fn().mockResolvedValueOnce(unavailable).mockResolvedValue(final);
    const view = renderHook(() => useSessionRecovery(reader));
    await advance();
    expect(view.result.current.recovery.phase).toBe('connecting');
    await advance(4_999); expect(reader).toHaveBeenCalledTimes(1);
    await advance(1); expect(view.result.current.session).toEqual(final);
    await advance(100_000); expect(reader).toHaveBeenCalledTimes(2);
  });
  it('spaces checks from completion, deduplicates manual retries and bounds hung requests', async () => {
    const signals: AbortSignal[] = [];
    const reader = vi.fn((_fetcher, options) => {
      signals.push(options.signal);
      return new Promise<SessionState>(() => {});
    });
    const view = renderHook(() => useSessionRecovery(reader));
    await advance();
    act(() => { void view.result.current.refresh(); void view.result.current.refresh(); });
    expect(reader).toHaveBeenCalledTimes(1);
    await advance(20_000); expect(signals[0]?.aborted).toBe(true);
    await advance(4_999); expect(reader).toHaveBeenCalledTimes(1);
    await advance(1); expect(reader).toHaveBeenCalledTimes(2);
    await advance(65_000); expect(view.result.current.recovery.phase).toBe('exhausted');
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await advance(60_000); expect(reader).toHaveBeenCalledTimes(4);
  });
  it('counts expedited checks without aborting the final request before its response', async () => {
    let finish!: (value: SessionState) => void;
    const reader = vi.fn().mockResolvedValue(unavailable);
    const view = renderHook(() => useSessionRecovery(reader));
    await advance();
    for (let i = 1; i < 17; i++) await act(async () => { await view.result.current.refresh(); });
    reader.mockImplementationOnce(() => new Promise<SessionState>((resolve) => { finish = resolve; }));
    act(() => { void view.result.current.refresh(); }); await advance();
    expect(reader).toHaveBeenCalledTimes(18);
    expect(view.result.current.recovery.busy).toBe(true);
    act(() => { void view.result.current.refresh(); }); expect(reader).toHaveBeenCalledTimes(18);
    await act(async () => finish(authenticated));
    expect(view.result.current.session).toEqual(authenticated);
    await advance(90_000); expect(reader).toHaveBeenCalledTimes(18);
  });
  it('requires an explicit fresh window after the request cap', async () => {
    const reader = vi.fn().mockResolvedValue(unavailable);
    const view = renderHook(() => useSessionRecovery(reader)); await advance();
    for (let i = 1; i < 18; i++) await act(async () => { await view.result.current.refresh(); });
    expect(view.result.current.recovery.phase).toBe('exhausted');
    await advance(90_000); expect(reader).toHaveBeenCalledTimes(18);
    reader.mockResolvedValue(signedOut);
    await act(async () => { await view.result.current.refresh(); });
    expect(view.result.current.session).toEqual(signedOut);
  });
  it('aborts hidden work, resumes once inside the original window, and rejects late responses', async () => {
    let finish!: (value: SessionState) => void;
    const reader = vi.fn().mockImplementationOnce(() => new Promise<SessionState>((resolve) => { finish = resolve; })).mockResolvedValue(unavailable);
    const view = renderHook(() => useSessionRecovery(reader)); await advance();
    visibility(true); await advance(30_000); expect(reader).toHaveBeenCalledTimes(1);
    visibility(false); await advance(); expect(reader).toHaveBeenCalledTimes(2);
    await act(async () => finish(authenticated));
    expect(view.result.current.session.status).toBe('unavailable');
    visibility(true); await advance(60_000); visibility(false); await advance();
    expect(reader).toHaveBeenCalledTimes(2);
    expect(view.result.current.recovery.phase).toBe('exhausted');
  });
  it('defers its first window offline and cancels traffic during later offline periods', async () => {
    online(false);
    const reader = vi.fn().mockResolvedValue(unavailable);
    const view = renderHook(() => useSessionRecovery(reader)); await advance(100_000);
    expect(reader).not.toHaveBeenCalled();
    expect(view.result.current.recovery.phase).toBe('offline');
    online(true); await advance(); expect(reader).toHaveBeenCalledTimes(1);
    online(false); act(() => { void view.result.current.refresh(); });
    await advance(90_000); online(true); await advance();
    expect(reader).toHaveBeenCalledTimes(1);
    expect(view.result.current.recovery.phase).toBe('exhausted');
  });
  it('stops for forbidden and rate limited responses, enables retry without sending traffic', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'retry-after': '10' } }));
    const view = renderHook(() => useSessionRecovery((_fetcher, options) => readSession(fetcher, options)));
    await advance(); expect(view.result.current.recovery.phase).toBe('rate-limited');
    expect(view.result.current.recovery.retryDisabled).toBe(true);
    act(() => { void view.result.current.refresh(); }); await advance(10_000);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(view.result.current.recovery.retryDisabled).toBe(false);
    fetcher.mockResolvedValue(new Response('{}', { status: 403 }));
    await act(async () => { await view.result.current.refresh(); });
    expect(view.result.current.recovery.phase).toBe('blocked');
    await advance(100_000); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('invalidates reads before sign-out and never restores a stale identity', async () => {
    let finish!: (value: SessionState) => void;
    const reader = vi.fn(() => new Promise<SessionState>((resolve) => { finish = resolve; }));
    const view = renderHook(() => useSessionRecovery(reader)); await advance();
    act(() => view.result.current.setSignedOut());
    await act(async () => finish(authenticated)); await advance(100_000);
    expect(view.result.current.session).toEqual(signedOut); expect(reader).toHaveBeenCalledTimes(1);
  });
  it('leaves only one live probe under Strict Mode and none after unmount', async () => {
    const signals: AbortSignal[] = [];
    const reader = vi.fn((_fetcher, options) => { signals.push(options.signal); return new Promise<SessionState>(() => {}); });
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const view = renderHook(() => useSessionRecovery(reader), { wrapper }); await advance();
    expect(signals.filter((signal) => !signal.aborted)).toHaveLength(1);
    view.unmount(); expect(signals.every((signal) => signal.aborted)).toBe(true);
    await advance(100_000); expect(signals.filter((signal) => !signal.aborted)).toHaveLength(0);
  });
});
