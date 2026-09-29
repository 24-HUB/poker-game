import { legalActions } from './betting.js';
import { assertDeck } from './cards.js';
import { evaluateSeven } from './evaluate.js';
import { settlePots } from './pots.js';
import type { Card, EngineSeat, EngineSettlement, EngineTransition, HandSeat, HandState, PokerAction, Street } from './types.js';

export type { EngineTransition } from './types.js';
export { legalActions } from './betting.js';

function clockwise(seats: readonly HandSeat[], afterSeat: number): HandSeat[] {
  return [...seats].sort((left, right) =>
    ((left.seat - afterSeat + 5) % 6) - ((right.seat - afterSeat + 5) % 6));
}

function active(seat: HandSeat): boolean {
  return !seat.folded && !seat.allIn;
}

function nextActor(state: HandState, afterSeat: number): string | null {
  for (const seat of clockwise(state.seats, afterSeat)) {
    if (active(seat) && (!seat.acted || seat.streetContribution < state.currentBet)) return seat.accountId;
  }
  return null;
}

function postBlind(seat: HandSeat, amount: number): HandSeat {
  const paid = Math.min(seat.stack, amount);
  return { ...seat, stack: seat.stack - paid, streetContribution: paid, totalContribution: paid, allIn: seat.stack === paid };
}

function dealBoard(state: HandState, count: number, street: Street): HandState {
  const first = state.deckIndex + 1; // burn one before each community-card street
  const board = [...state.board, ...state.deck.slice(first, first + count)];
  if (board.length !== state.board.length + count) throw new RangeError('Deck exhausted');
  return {
    ...state, street, board, deckIndex: first + count,
    seats: state.seats.map((seat) => ({ ...seat, streetContribution: 0, acted: false, lastFaced: 0 })),
    currentBet: 0, lastFullRaiseIncrement: state.bigBlind,
  };
}

function settle(state: HandState): EngineTransition {
  const contenders = state.seats.filter((seat) => !seat.folded);
  const ranks = new Map(contenders.map((seat) => [seat.accountId,
    contenders.length === 1 ? { category: 0, tiebreak: [0] } : evaluateSeven([...state.board, ...seat.holeCards])]));
  const result = settlePots({ buttonSeat: state.buttonSeat, seats: state.seats.map((seat) => ({
    accountId: seat.accountId, seat: seat.seat, contribution: seat.totalContribution,
    folded: seat.folded, rank: ranks.get(seat.accountId) ?? null,
  })) });
  const settlement: EngineSettlement = {
    contributions: Object.fromEntries(state.seats.map((seat) => [seat.accountId, seat.totalContribution])),
    payouts: result.totalPayouts,
    finalStacks: state.seats.map((seat) => seat.stack + result.totalPayouts[seat.accountId]!),
    manualActionAccountIds: state.seats.filter((seat) => seat.manualAction).map((seat) => seat.accountId),
    revealedCards: contenders.length > 1
      ? contenders.map((seat) => ({ accountId: seat.accountId, cards: seat.holeCards })) : [],
    pots: result.pots,
  };
  return { state: { ...state, street: 'complete', actorAccountId: null }, settlement };
}

function advance(state: HandState): EngineTransition {
  const contenders = state.seats.filter((seat) => !seat.folded);
  if (contenders.length === 1) return settle(state);
  const actionable = contenders.filter((seat) => !seat.allIn);
  if (actionable.length === 1) {
    const player = actionable[0]!;
    const amountToMatch = Math.max(...contenders.filter((seat) => seat.accountId !== player.accountId)
      .map((seat) => seat.streetContribution));
    if (player.streetContribution < amountToMatch) {
      return { state: { ...state, actorAccountId: player.accountId }, settlement: null };
    }
  }
  // With at most one player able to bet and nothing left to call, run out the board.
  if (actionable.length <= 1) {
    let runout = state;
    if (runout.street === 'preflop') runout = dealBoard(runout, 3, 'flop');
    if (runout.street === 'flop') runout = dealBoard(runout, 1, 'turn');
    if (runout.street === 'turn') runout = dealBoard(runout, 1, 'river');
    return settle(runout);
  }
  if (state.street === 'river') return settle(state);
  const next = state.street === 'preflop' ? dealBoard(state, 3, 'flop')
    : state.street === 'flop' ? dealBoard(state, 1, 'turn') : dealBoard(state, 1, 'river');
  const actorAccountId = nextActor(next, next.buttonSeat);
  return { state: { ...next, actorAccountId }, settlement: null };
}

export function startHand(input: {
  seats: EngineSeat[];
  buttonSeat: number;
  smallBlind: number;
  bigBlind: number;
  deck: readonly Card[];
}): EngineTransition {
  const { seats, buttonSeat, smallBlind, bigBlind, deck } = input;
  assertDeck(deck);
  if (seats.length < 2 || seats.length > 6 ||
      !Number.isSafeInteger(smallBlind) || smallBlind <= 0 ||
      !Number.isSafeInteger(bigBlind) || bigBlind <= smallBlind ||
      !seats.some((seat) => seat.seat === buttonSeat) ||
      new Set(seats.map((seat) => seat.accountId)).size !== seats.length ||
      new Set(seats.map((seat) => seat.seat)).size !== seats.length ||
      seats.some((seat) => !seat.accountId || !Number.isInteger(seat.seat) || seat.seat < 0 || seat.seat > 5 ||
        !Number.isSafeInteger(seat.startingStack) || seat.startingStack <= 0)) throw new RangeError('Invalid hand input');
  const ordered = [...seats].sort((left, right) => left.seat - right.seat);
  const dealingOrder = [...ordered].sort((left, right) =>
    ((left.seat - buttonSeat + 5) % 6) - ((right.seat - buttonSeat + 5) % 6));
  const dealt = new Map<string, Card[]>();
  let deckIndex = 0;
  for (let round = 0; round < 2; round += 1) for (const seat of dealingOrder) {
    const cards = dealt.get(seat.accountId) ?? [];
    cards.push(deck[deckIndex++]!);
    dealt.set(seat.accountId, cards);
  }
  let handSeats: HandSeat[] = ordered.map((seat) => ({
    ...seat, stack: seat.startingStack, streetContribution: 0, totalContribution: 0,
    folded: false, allIn: false, acted: false, lastFaced: 0, manualAction: false,
    holeCards: dealt.get(seat.accountId)! as [Card, Card],
  }));
  const smallSeat = seats.length === 2 ? buttonSeat : dealingOrder[0]!.seat;
  const bigSeat = seats.length === 2 ? dealingOrder[0]!.seat : dealingOrder[1]!.seat;
  handSeats = handSeats.map((seat) => seat.seat === smallSeat ? postBlind(seat, smallBlind)
    : seat.seat === bigSeat ? postBlind(seat, bigBlind) : seat);
  const state: HandState = {
    seats: handSeats, buttonSeat, smallBlind, bigBlind, street: 'preflop', board: [], deck: [...deck], deckIndex,
    currentBet: bigBlind, lastFullRaiseIncrement: bigBlind, actorAccountId: null, version: 0,
  };
  if (handSeats.filter(active).length <= 1) return advance(state);
  const actorAccountId = nextActor(state, bigSeat);
  return { state: { ...state, actorAccountId }, settlement: null };
}

export function applyAction(
  state: HandState, accountId: string, action: PokerAction, source: 'manual' | 'timeout',
): EngineTransition {
  const legal = legalActions(state, accountId);
  if (!legal.canFold) throw new RangeError('Not an actionable turn');
  const actor = state.seats.find((seat) => seat.accountId === accountId)!;
  if (action.type === 'check' && !legal.canCheck) throw new RangeError('Cannot check');
  if (action.type === 'call' && (legal.canCheck || legal.callAmount === 0)) throw new RangeError('Cannot call');
  if (action.type === 'raise') {
    if (!legal.raise || !Number.isSafeInteger(action.raiseTo) ||
        action.raiseTo < legal.raise.minRaiseTo || action.raiseTo > legal.raise.maxRaiseTo ||
        (legal.raise.shortAllInOnly && action.raiseTo !== legal.raise.maxRaiseTo)) throw new RangeError('Illegal raise');
  }
  const previousBet = state.currentBet;
  const fullRaise = action.type === 'raise' && action.raiseTo >=
    (previousBet < state.bigBlind ? state.bigBlind : previousBet + state.lastFullRaiseIncrement);
  const nextBet = action.type === 'raise' ? action.raiseTo : previousBet;
  const seats = state.seats.map((seat) => {
    if (seat.accountId !== accountId) return fullRaise ? { ...seat, acted: false } : { ...seat };
    const paid = action.type === 'raise' ? action.raiseTo - seat.streetContribution
      : action.type === 'call' ? legal.callAmount : 0;
    return {
      ...seat, stack: seat.stack - paid,
      streetContribution: seat.streetContribution + paid,
      totalContribution: seat.totalContribution + paid,
      folded: action.type === 'fold', allIn: seat.stack === paid,
      acted: true, lastFaced: nextBet, manualAction: seat.manualAction || source === 'manual',
    };
  });
  const next: HandState = {
    ...state, seats, currentBet: nextBet,
    lastFullRaiseIncrement: fullRaise
      ? previousBet < state.bigBlind ? state.bigBlind : nextBet - previousBet
      : state.lastFullRaiseIncrement,
    actorAccountId: null, version: state.version + 1,
  };
  if (seats.filter((seat) => !seat.folded).length === 1 || seats.filter(active).length <= 1) return advance(next);
  const actorAccountId = nextActor(next, actor.seat);
  if (!actorAccountId) return advance(next);
  return { state: { ...next, actorAccountId }, settlement: null };
}
