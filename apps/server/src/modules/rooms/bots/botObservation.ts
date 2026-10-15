import { legalActions, type HandState } from '@poker/poker-engine';
import type { BotObservation } from './botStrategy';

export function buildBotObservation(hand: HandState, botId: string): BotObservation {
  const own = hand.seats.find((seat) => seat.accountId === botId);
  if (!own) throw new RangeError('Bot must be dealt into this hand');
  const legal = legalActions(hand, botId);
  return Object.freeze({ botId, holeCards: Object.freeze([...own.holeCards]) as readonly [number, number],
    board: Object.freeze([...hand.board]), street: hand.street, buttonSeat: hand.buttonSeat,
    smallBlind: hand.smallBlind, bigBlind: hand.bigBlind, currentBet: hand.currentBet,
    pot: hand.seats.reduce((sum, seat) => sum + seat.totalContribution, 0), stack: own.stack,
    players: Object.freeze(hand.seats.map((seat) => Object.freeze({ accountId: seat.accountId, seat: seat.seat,
      stack: seat.stack, streetContribution: seat.streetContribution, totalContribution: seat.totalContribution,
      folded: seat.folded, allIn: seat.allIn }))),
    legal: Object.freeze({ ...legal, raise: legal.raise ? Object.freeze({ ...legal.raise }) : null }),
  });
}
