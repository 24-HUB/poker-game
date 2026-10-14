// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { GameView } from '@poker/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { HandCompletionBar } from './HandCompletionBar';

afterEach(() => { cleanup(); vi.useRealTimers(); });
it('uses server timing without a local advance and suspends countdown while reconnecting', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T11:00:00Z'));
  const game = { sessionId: 's', handId: 'h', handNumber: 1, handPhase: 'result', sessionPhase: 'playing',
    serverTime: '2026-10-14T10:00:00Z', nextTransitionAt: '2026-10-14T10:00:05Z', nextTransition: 'next-hand' } as GameView;
  const props = { game, accountId: 'host', status: 'connected' as const, pending: false, canStart: false, onStart: vi.fn() };
  const view = render(<HandCompletionBar {...props} />);
  expect(screen.getByText('Next hand in 5s')).toBeVisible();
  act(() => vi.advanceTimersByTime(2000));
  view.rerender(<HandCompletionBar {...props} pending />);
  expect(screen.getByText('Next hand in 3s')).toBeVisible();
  view.rerender(<HandCompletionBar {...props} status="reconnecting" />);
  expect(screen.queryByText(/Next hand in/)).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(4000));
  view.rerender(<HandCompletionBar {...props} />);
  expect(screen.getByText('Starting next hand…')).toBeVisible();
  expect(props.onStart).not.toHaveBeenCalled();
});
it('never promises another hand for ending, paused or interrupted sessions', () => {
  const game = { sessionPhase: 'ending', handPhase: 'result', serverTime: new Date().toISOString(), nextTransition: 'session-end' } as GameView;
  const props = { game, accountId: 'host', status: 'connected' as const, pending: false, canStart: false, onStart: vi.fn() };
  const view = render(<HandCompletionBar {...props} />);
  expect(screen.getByText('Finishing session…')).toBeVisible();
  view.rerender(<HandCompletionBar {...props} game={{ ...game, handPhase: 'paused' }} />);
  expect(screen.getByText('Result confirmation paused')).toBeVisible();
  view.rerender(<HandCompletionBar {...props} game={{ ...game, sessionPhase: 'aborted' }} />);
  expect(screen.getByText('Session interrupted')).toBeVisible();
});
