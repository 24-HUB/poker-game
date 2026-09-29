import { describe, expect, it } from 'vitest';

import { applyAction, legalActions, startHand } from './hand.js';
import type { EngineTransition } from './hand.js';

const deck = Array.from({ length: 52 }, (_, index) => index);
const seats = (stacks: number[]) => stacks.map((stack, seat) => ({ accountId: `p${seat}`, seat, startingStack: stack }));
const start = (stacks: number[]) => startHand({ seats: seats(stacks), buttonSeat: 0, smallBlind: 10, bigBlind: 20, deck });
const act = (transition: EngineTransition, type: 'fold' | 'check' | 'call' | 'raise', raiseTo?: number) =>
  applyAction(transition.state, transition.state.actorAccountId!, type === 'raise' ? { type, raiseTo: raiseTo! } : { type }, 'manual');

describe('holdem hand transitions', () => {
  it('uses heads-up button as small blind and first preflop actor', () => {
    const hand = start([1000, 1000]);
    expect(hand.state.seats.map((seat) => [seat.stack, seat.streetContribution])).toEqual([[990, 10], [980, 20]]);
    expect(hand.state.actorAccountId).toBe('p0');
    expect(legalActions(hand.state, 'p0').callAmount).toBe(10);
    const afterCall = act(hand, 'call');
    expect(afterCall.state.actorAccountId).toBe('p1');
    const flop = act(afterCall, 'check');
    expect(flop.state.street).toBe('flop');
    expect(flop.state.board).toHaveLength(3);
    expect(flop.state.actorAccountId).toBe('p1');
  });

  it('rotates blinds and actors clockwise at six seats', () => {
    const hand = start([1000, 1000, 1000, 1000, 1000, 1000]);
    expect(hand.state.seats[1]?.streetContribution).toBe(10);
    expect(hand.state.seats[2]?.streetContribution).toBe(20);
    expect(hand.state.actorAccountId).toBe('p3');
    let current = hand;
    for (let i = 0; i < 5; i += 1) current = act(current, 'call');
    expect(legalActions(current.state, 'p2')).toMatchObject({ canCheck: true, raise: { minRaiseTo: 40 } });
    current = act(current, 'check');
    expect(current.state.street).toBe('flop');
    expect(current.state.actorAccountId).toBe('p1');
  });

  it('settles an uncontested fold without revealing cards', () => {
    const result = act(start([1000, 1000]), 'fold');
    expect(result.settlement?.payouts).toEqual({ p0: 0, p1: 30 });
    expect(result.settlement?.revealedCards).toEqual([]);
    expect(result.settlement?.manualActionAccountIds).toEqual(['p0']);
  });

  it('handles a short blind and all-in runout without a stuck actor', () => {
    const hand = start([1000, 5]);
    expect(hand.state.seats[1]?.stack).toBe(0);
    expect(hand.state.actorAccountId).toBeNull();
    expect(hand.settlement).not.toBeNull();
    expect(hand.state.board).toHaveLength(5);
    expect(hand.settlement?.finalStacks.every((stack) => stack >= 0)).toBe(true);
  });

  it('handles a five-chip small blind and ten-chip big blind', () => {
    const hand = startHand({ seats: seats([5, 10]), buttonSeat: 0, smallBlind: 10, bigBlind: 20, deck });
    expect(hand.state.seats.map((seat) => seat.stack)).toEqual([0, 0]);
    expect(hand.settlement?.finalStacks.reduce((sum, stack) => sum + stack, 0)).toBe(15);
  });

  it('does not count a timeout as a manual action', () => {
    const hand = start([1000, 1000]);
    const timedOut = applyAction(hand.state, 'p0', { type: 'fold' }, 'timeout');
    expect(timedOut.settlement?.manualActionAccountIds).toEqual([]);
  });

  it('shortAllInDoesNotReopenAlone', () => {
    let hand = start([1000, 1000, 170, 1000]);
    hand = act(hand, 'raise', 120); // p3: full raise by 100
    hand = act(hand, 'call'); // p0
    hand = act(hand, 'call'); // p1
    hand = act(hand, 'raise', 170); // p2: short all-in, +50
    expect(legalActions(hand.state, 'p3').raise).toBeNull();
    expect(() => act(hand, 'raise', 300)).toThrow();
  });

  it('cumulativeShortAllInsReopen', () => {
    let hand = start([1000, 170, 220, 1000, 1000]);
    hand = act(hand, 'raise', 120); // p3
    hand = act(hand, 'call'); // p4
    hand = act(hand, 'call'); // p0
    hand = act(hand, 'raise', 170); // p1: +50
    hand = act(hand, 'raise', 220); // p2: another +50
    expect(legalActions(hand.state, 'p3').raise?.minRaiseTo).toBe(320);
  });

  it('completes a short opening all-in to the minimum bet', () => {
    let hand = start([1000, 30, 1000]);
    hand = act(hand, 'call');
    hand = act(hand, 'call');
    hand = act(hand, 'check');
    expect(hand.state.street).toBe('flop');
    expect(legalActions(hand.state, 'p1').raise?.minRaiseTo).toBe(10);
    hand = act(hand, 'raise', 10);
    expect(legalActions(hand.state, 'p2').raise?.minRaiseTo).toBe(20);
    hand = act(hand, 'raise', 20);
    expect(legalActions(hand.state, 'p0').raise?.minRaiseTo).toBe(40);
  });

  it('conserves chips and terminates generated legal sequences', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const rotated = [...deck.slice(seed), ...deck.slice(0, seed)];
      let hand = startHand({ seats: seats([100, 80, 60, 45, 30, 25]), buttonSeat: seed % 6,
        smallBlind: 10, bigBlind: 20, deck: rotated });
      let steps = 0;
      while (hand.state.actorAccountId) {
        const state = hand.state;
        expect(new Set([...state.seats.flatMap((seat) => seat.holeCards), ...state.board]).size)
          .toBe(state.seats.length * 2 + state.board.length);
        expect(state.seats.every((seat) => seat.stack >= 0)).toBe(true);
        expect(state.seats.reduce((sum, seat) => sum + seat.stack + seat.totalContribution, 0)).toBe(340);
        const actor = state.actorAccountId!;
        const legal = legalActions(state, actor);
        expect(legal.canFold).toBe(true);
        const action = seed % 7 === 0 && steps % 5 === 0 ? { type: 'fold' as const }
          : legal.raise && steps % 3 === 0 ? { type: 'raise' as const, raiseTo: legal.raise.minRaiseTo }
            : legal.canCheck ? { type: 'check' as const } : { type: 'call' as const };
        hand = applyAction(state, actor, action, 'manual');
        steps += 1;
        expect(steps).toBeLessThan(80);
      }
      expect(hand.settlement).not.toBeNull();
      expect(hand.settlement!.finalStacks.reduce((sum, stack) => sum + stack, 0)).toBe(340);
    }
  });

  it('keeps an invalid action from mutating input', () => {
    const hand = start([1000, 1000]);
    const before = structuredClone(hand.state);
    expect(() => applyAction(hand.state, 'p0', { type: 'check' }, 'manual')).toThrow();
    expect(hand.state).toEqual(before);
  });
});
