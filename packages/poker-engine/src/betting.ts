import type { HandState, LegalActions } from './types.js';

export const NO_ACTIONS: LegalActions = { canFold: false, canCheck: false, callAmount: 0, raise: null };

export function legalActions(state: HandState, accountId: string): LegalActions {
  if (state.street === 'complete' || state.actorAccountId !== accountId) return NO_ACTIONS;
  const seat = state.seats.find((candidate) => candidate.accountId === accountId);
  if (!seat || seat.folded || seat.allIn) return NO_ACTIONS;
  const faced = Math.max(0, state.currentBet - seat.streetContribution);
  const callAmount = Math.min(faced, seat.stack);
  const maxRaiseTo = seat.streetContribution + seat.stack;
  const mayReopen = !seat.acted || state.currentBet - seat.lastFaced >= state.lastFullRaiseIncrement;
  const minimum = state.currentBet < state.bigBlind
    ? state.bigBlind
    : state.currentBet + state.lastFullRaiseIncrement;
  const raise = mayReopen && maxRaiseTo > state.currentBet && maxRaiseTo > seat.streetContribution
    ? { minRaiseTo: Math.min(minimum, maxRaiseTo), maxRaiseTo, shortAllInOnly: maxRaiseTo < minimum }
    : null;
  return { canFold: true, canCheck: faced === 0, callAmount, raise };
}
