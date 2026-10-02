// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PullReceipt } from '@poker/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PullReveal } from './PullReveal';

const item = { id: 'scout-avatar', name: 'Star Scout', slot: 'avatar' as const, rarity: 'R' as const, assetUrl: '/art/cosmetics/star-scout-avatar.svg' };
const receipt: PullReceipt = { requestId: '4eb919d4-20f5-4fa8-80c6-9f79aab9c2a0', bannerVersion: 'celestial-v1', count: 1,
  cost: 5, committedAt: '2026-10-01T10:00:00Z', walletRevision: 1, progress: { sinceSr: 1, sinceSsr: 1 },
  results: [{ itemId: item.id, item, rarity: 'R', duplicate: false, progress: { sinceSr: 1, sinceSsr: 1 } }] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('committed invitation reveal', () => {
  it('skips to the same saved outcome and moves keyboard focus to its heading', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const onContinue = vi.fn();
    render(<PullReveal receipt={receipt} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip reveal' }));
    expect(screen.getByRole('heading', { name: 'Star Scout' })).toBeVisible();
    expect(screen.getByRole('heading', { name: /^Your invitations$/ })).toHaveFocus();
    expect(screen.getByText('Avatar · New')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it('shows reduced-motion and duplicate outcomes immediately without changing the receipt', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const duplicate = { ...receipt, results: [{ ...receipt.results[0]!, duplicate: true }] };
    render(<PullReveal receipt={duplicate} onContinue={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Skip reveal' })).not.toBeInTheDocument();
    expect(screen.getByText('Avatar · Duplicate · no refund')).toBeVisible();
    expect(duplicate.requestId).toBe(receipt.requestId);
  });
});
