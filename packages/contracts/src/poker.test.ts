import { describe, expect, it } from 'vitest';

import { gameCommandSchema, gameViewSchema } from './poker.js';

const mutation = {
  commandId: '11111111-1111-4111-8111-111111111111',
  authorityBootId: 'boot-a',
  issuedAt: '2026-09-29T00:00:00.000Z',
  roomId: 'room-a',
  controlEpoch: 2,
};

const action = {
  type: 'game:action',
  ...mutation,
  sessionId: 'session-a',
  handId: 'hand-a',
  expectedGameVersion: 3,
  action: { type: 'raise', raiseTo: 40 },
};

describe('poker contracts', () => {
  it('accepts valid sync, start, end and action commands', () => {
    expect(gameCommandSchema.safeParse({ type: 'game:sync', roomId: 'room-a' }).success).toBe(true);
    expect(gameCommandSchema.safeParse({ type: 'session:start', ...mutation }).success).toBe(true);
    expect(gameCommandSchema.safeParse({ type: 'session:end', ...mutation, sessionId: 'session-a' }).success).toBe(true);
    expect(gameCommandSchema.safeParse(action).success).toBe(true);
    expect(gameCommandSchema.safeParse({ ...action, action: { type: 'call' } }).success).toBe(true);
  });

  it('rejectsInvalidRaiseTo', () => {
    for (const raiseTo of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(gameCommandSchema.safeParse({ ...action, action: { type: 'raise', raiseTo } }).success).toBe(false);
    }
  });

  it('rejectsForgedIdentity', () => {
    for (const extra of [{ accountId: 'forged' }, { deck: [1, 2, 3] }, { payout: 999 }]) {
      expect(gameCommandSchema.safeParse({ ...action, ...extra }).success).toBe(false);
    }
    expect(gameCommandSchema.safeParse({ type: 'game:sync', roomId: 'room-a', accountId: 'forged' }).success).toBe(false);
  });

  it('requiresActionVersionAndControlEpoch', () => {
    const { expectedGameVersion: _version, ...withoutVersion } = action;
    const { controlEpoch: _epoch, ...withoutEpoch } = action;
    expect(gameCommandSchema.safeParse(withoutVersion).success).toBe(false);
    expect(gameCommandSchema.safeParse(withoutEpoch).success).toBe(false);
  });

  it('rejects internal state in public snapshots', () => {
    const view = {
      roomId: 'room-a', authorityBootId: 'boot-a', sessionId: 'session-a', handId: 'hand-a',
      snapshotRevision: 4, gameVersion: 3, sessionPhase: 'playing', handPhase: 'flop',
      participants: [
        { accountId: 'account-a', displayName: 'Alice', seat: 0, stack: 980, streetContribution: 20,
          totalContribution: 20, folded: false, allIn: false, connected: true },
        { accountId: 'account-b', displayName: 'Bob', seat: 1, stack: 980, streetContribution: 20,
          totalContribution: 20, folded: false, allIn: false, connected: true },
      ],
      board: [1, 2, 3], pots: [{ amount: 40, eligibleAccountIds: ['account-a'] }], buttonSeat: 0,
      actorAccountId: 'account-a', serverTime: '2026-09-29T00:00:00.000Z',
      deadline: '2026-09-29T00:00:30.000Z', holeCards: [4, 5], revealedCards: [],
      legalActions: { canFold: true, canCheck: false, callAmount: 20, raise: { minRaiseTo: 40, maxRaiseTo: 1000, shortAllInOnly: false } },
      control: { isController: true, epoch: 2 }, handResult: null, sessionResult: null,
    };
    expect(gameViewSchema.safeParse(view).success).toBe(true);
    expect(gameViewSchema.safeParse({ ...view, deck: [6] }).success).toBe(false);
    expect(gameViewSchema.safeParse({ ...view, allHands: [] }).success).toBe(false);
  });
});
