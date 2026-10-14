// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { GameView } from '@poker/contracts';
import { useTurnClock } from './useTurnClock';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('counts down against server time even when the browser clock is an hour ahead', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-12T04:00:00Z'));
  const view = renderHook(() => useTurnClock({ serverTime: '2026-10-12T03:00:00Z', deadline: '2026-10-12T03:00:05Z' } as GameView));
  expect(view.result.current).toBe(5);
  act(() => vi.advanceTimersByTime(1000));
  expect(view.result.current).toBe(4);
  act(() => vi.advanceTimersByTime(10_000));
  expect(view.result.current).toBe(0);
});

it('has no countdown without an authoritative deadline', () => {
  expect(renderHook(() => useTurnClock(null)).result.current).toBeNull();
});

it('does not reset a result interval when the same snapshot remounts', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
  const game = { serverTime: '2026-10-14T09:00:00Z', nextTransitionAt: '2026-10-14T09:00:05Z' } as GameView;
  const first = renderHook(() => useTurnClock(game, game.nextTransitionAt));
  expect(first.result.current).toBe(5);
  act(() => vi.advanceTimersByTime(2000)); first.unmount();
  expect(renderHook(() => useTurnClock(game, game.nextTransitionAt)).result.current).toBe(3);
});
