import { cardRank, cardSuit, evaluateCards } from '@poker/poker-engine';
import type { LegalActions, PokerAction, Street } from '@poker/poker-engine';

export type BotObservation = Readonly<{
  botId: string; holeCards: readonly [number, number]; board: readonly number[]; street: Street;
  buttonSeat: number; smallBlind: number; bigBlind: number; currentBet: number; pot: number; stack: number;
  players: readonly Readonly<{ accountId: string; seat: number; stack: number; streetContribution: number; totalContribution: number; folded: boolean; allIn: boolean }>[];
  legal: Readonly<LegalActions>;
}>;

export function handStrength(observation: BotObservation): 'strong' | 'medium' | 'weak' {
  const [a, b] = observation.holeCards.map(cardRank) as [number, number];
  if (observation.street === 'preflop') {
    if (a === b && a >= 10 || Math.max(a, b) === 14 && Math.min(a, b) >= 12) return 'strong';
    if (a === b || Math.max(a, b) === 14 || Math.min(a, b) >= 10 ||
        cardSuit(observation.holeCards[0]) === cardSuit(observation.holeCards[1]) && Math.abs(a - b) === 1 && Math.min(a, b) >= 5) return 'medium';
    return 'weak';
  }
  const cards = [...observation.holeCards, ...observation.board];
  const rank = evaluateCards(cards);
  if (rank.category >= 2) return 'strong';
  const ranks = new Set(cards.map(cardRank));
  // A234 and JQKA have one completion rank, so neither is open-ended.
  const openEnded = Array.from({ length: 8 }, (_, i) => i + 2)
    .some((low) => [0, 1, 2, 3].every((offset) => ranks.has(low + offset)));
  const flushDraw = [0, 1, 2, 3].some((suit) => cards.filter((card) => cardSuit(card) === suit).length === 4);
  return rank.category === 1 || flushDraw || openEnded ? 'medium' : 'weak';
}

export function chooseBotAction(observation: BotObservation, sample: number): PokerAction {
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('Uniform sample required');
  const { legal } = observation;
  const strength = handStrength(observation);
  const raise = legal.raise;
  if (strength === 'strong') {
    if (raise && sample < 0.65) return { type: 'raise', raiseTo: raise.shortAllInOnly ? raise.maxRaiseTo
      : Math.min(raise.maxRaiseTo, Math.max(raise.minRaiseTo, observation.currentBet + Math.floor(observation.pot / 2))) };
    if (legal.canCheck) return { type: 'check' };
    if (legal.callAmount > 0) return { type: 'call' };
  } else if (strength === 'medium') {
    if (legal.canCheck) return { type: 'check' };
    if (legal.callAmount > 0 && legal.callAmount <= observation.pot / 3 && legal.callAmount <= observation.stack * 0.15) return { type: 'call' };
  } else {
    if (legal.canCheck) return raise && sample < 0.05 ? { type: 'raise', raiseTo: raise.minRaiseTo } : { type: 'check' };
    if (sample < 0.10 && legal.callAmount > 0 && legal.callAmount <= observation.bigBlind) return { type: 'call' };
  }
  return legal.canCheck ? { type: 'check' } : { type: 'fold' };
}
