// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { HandReward } from './HandReward';

const receipt = {
  handId: 'hand-a', accountId: 'account-a', policyVersion: 1, completedDateUtc: '2026-09-30',
  qualified: true, reason: 'AWARDED' as const, requestedParticipation: 1, requestedBonus: 1,
  grantedParticipation: 1, grantedBonus: 1,
};

describe('HandReward', () => {
  afterEach(cleanup);

  it('reports only committed awards and explains a capped bonus', () => {
    const view = render(createElement(HandReward, {}));
    expect(screen.getByText(/not confirmed/i)).toBeVisible();
    view.rerender(createElement(HandReward, { receipt }));
    expect(screen.getByRole('status')).toHaveTextContent('+2 tickets earned');
    view.rerender(createElement(HandReward, { receipt: { ...receipt, grantedBonus: 0 } }));
    expect(screen.getByRole('status')).toHaveTextContent('daily cap limited the bonus');
  });

  it('explains ineligible and fully capped hands without claiming an award', () => {
    const view = render(createElement(HandReward, { receipt: { ...receipt, qualified: false,
      reason: 'NO_MANUAL_ACTION', requestedParticipation: 0, requestedBonus: 0,
      grantedParticipation: 0, grantedBonus: 0 } }));
    expect(screen.getByText(/manual action/i)).toBeVisible();
    view.rerender(createElement(HandReward, { receipt: { ...receipt, reason: 'DAILY_CAP',
      grantedParticipation: 0, grantedBonus: 0 } }));
    expect(screen.getByText(/earning cap/i)).toBeVisible();
  });
});
