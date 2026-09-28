// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SessionBoundary } from './SessionBoundary';

describe('SessionBoundary', () => {
  it('keeps an unavailable backend distinct from signed out', () => {
    render(createElement(SessionBoundary, {
      session: { status: 'unavailable' },
      onRetry: vi.fn(),
      children: createElement('p', {}, 'Private room controls'),
    }));

    expect(screen.getByText('The game server is starting.')).toBeVisible();
    expect(screen.queryByText('Sign in to enter a private room.')).not.toBeInTheDocument();
    expect(screen.queryByText('Private room controls')).not.toBeInTheDocument();
  });

  it('renders private content only for a verified account', () => {
    render(createElement(SessionBoundary, {
      session: { status: 'authenticated', account: { accountId: 'account-a', displayName: 'Alice' } },
      onRetry: vi.fn(),
      children: createElement('p', {}, 'Private room controls'),
    }));

    expect(screen.getByText('Private room controls')).toBeVisible();
  });
});
