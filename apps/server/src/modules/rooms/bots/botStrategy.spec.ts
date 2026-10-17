import { chooseBotAction, handStrength, type BotObservation } from './botStrategy';
import { buildBotObservation } from './botObservation';
import { startHand } from '@poker/poker-engine';

const observation = (changes: Partial<BotObservation> = {}): BotObservation => ({
  botId: 'bot:a', holeCards: [12, 25], board: [], street: 'preflop', buttonSeat: 0,
  smallBlind: 10, bigBlind: 20, currentBet: 20, pot: 100, stack: 980,
  players: [], legal: { canCheck: false, canFold: true, callAmount: 10,
    raise: { minRaiseTo: 40, maxRaiseTo: 1000, shortAllInOnly: false } }, ...changes,
});

describe('casual bot decisions', () => {
  it('raises strong hands below 65%, uses half pot, then calls at the boundary', () => {
    expect(chooseBotAction(observation(), 0.649)).toEqual({ type: 'raise', raiseTo: 70 });
    expect(chooseBotAction(observation(), 0.65)).toEqual({ type: 'call' });
  });
  it('clamps to the minimum and exact short all-in targets', () => {
    expect(chooseBotAction(observation({ pot: 10 }), 0)).toEqual({ type: 'raise', raiseTo: 40 });
    expect(chooseBotAction(observation({ legal: { canFold: true, canCheck: false, callAmount: 10,
      raise: { minRaiseTo: 35, maxRaiseTo: 35, shortAllInOnly: true } } }), 0)).toEqual({ type: 'raise', raiseTo: 35 });
  });
  it('calls medium hands only within both price bounds and checks when free', () => {
    const medium = observation({ holeCards: [12, 2], pot: 90, stack: 200 });
    expect(chooseBotAction({ ...medium, legal: { ...medium.legal, callAmount: 30 } }, 0.2)).toEqual({ type: 'call' });
    expect(chooseBotAction({ ...medium, legal: { ...medium.legal, callAmount: 31 } }, 0.2)).toEqual({ type: 'fold' });
    expect(chooseBotAction({ ...medium, stack: 100, legal: { ...medium.legal, callAmount: 16 } }, 0.2)).toEqual({ type: 'fold' });
    expect(chooseBotAction({ ...medium, legal: { ...medium.legal, canCheck: true, callAmount: 0 } }, 0)).toEqual({ type: 'check' });
  });
  it('bounds weak bluff/call variation and folds expensive weak calls', () => {
    const weak = observation({ holeCards: [0, 18] });
    expect(chooseBotAction(weak, 0.099)).toEqual({ type: 'call' });
    expect(chooseBotAction(weak, 0.10)).toEqual({ type: 'fold' });
    expect(chooseBotAction({ ...weak, legal: { ...weak.legal, callAmount: 21 } }, 0)).toEqual({ type: 'fold' });
    const free = { ...weak, legal: { ...weak.legal, callAmount: 0, canCheck: true } };
    expect(chooseBotAction(free, 0.049)).toEqual({ type: 'raise', raiseTo: 40 });
    expect(chooseBotAction(free, 0.05)).toEqual({ type: 'check' });
  });
  it.each([
    [[8, 21], [], 'strong'], [[12, 24], [], 'strong'], [[0, 13], [], 'medium'],
    [[3, 4], [], 'medium'], [[0, 18], [], 'weak'],
    [[0, 13], [2, 15, 30], 'strong'],
    [[0, 3], [5, 8, 24], 'medium'],
    [[3, 17], [5, 19, 38], 'medium'],
    [[0, 15], [4, 19, 37], 'weak'],
    [[12, 13], [1, 15, 33], 'weak'],
    [[0, 14], [2, 16, 37], 'medium'],
  ])('classifies own cards %j with public board %j as %s', (holeCards, board, strength) => {
    expect(handStrength(observation({ holeCards: holeCards as [number, number], board: board as number[], street: (board as number[]).length ? 'flop' : 'preflop' }))).toBe(strength);
  });
  it('never passes hidden opponent cards or deck state into strategy', () => {
    const hand = startHand({ seats: [{ accountId: 'bot:a', seat: 0, startingStack: 1000 },
      { accountId: 'human', seat: 1, startingStack: 1000 }], buttonSeat: 0, smallBlind: 10, bigBlind: 20,
      deck: Array.from({ length: 52 }, (_, i) => i) }).state;
    const first = buildBotObservation(hand, 'bot:a');
    const changed = { ...hand, deck: [...hand.deck].reverse(), deckIndex: 40,
      seats: hand.seats.map((seat) => seat.accountId === 'human' ? { ...seat, holeCards: [50, 51] as const } : seat) };
    expect(buildBotObservation(changed, 'bot:a')).toEqual(first);
    expect(first).not.toHaveProperty('deck');
    expect(first).not.toHaveProperty('deckIndex');
    expect(first.players.every((player) => !('holeCards' in player))).toBe(true);
    expect(chooseBotAction(buildBotObservation(changed, 'bot:a'), 0.3)).toEqual(chooseBotAction(first, 0.3));
  });
});
