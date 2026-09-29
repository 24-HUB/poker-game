export type Card = number;

/** Category increases with hand strength, from high card (0) to straight flush (8). */
export type HandRank = { category: number; tiebreak: readonly number[] };

export type PotSeat = {
  accountId: string;
  seat: number;
  contribution: number;
  folded: boolean;
  rank: HandRank | null;
};

export type PotInput = { seats: readonly PotSeat[]; buttonSeat: number };
export type PotResult = {
  uncalledReturns: { accountId: string; amount: number }[];
  pots: {
    amount: number;
    eligibleAccountIds: string[];
    winners: string[];
    payouts: { accountId: string; amount: number }[];
  }[];
  totalPayouts: Record<string, number>;
};

export type EngineSeat = { accountId: string; seat: number; startingStack: number };
export type PokerAction =
  | { type: 'fold' | 'check' | 'call' }
  | { type: 'raise'; raiseTo: number };
export type LegalActions = {
  canFold: boolean;
  canCheck: boolean;
  callAmount: number;
  raise: { minRaiseTo: number; maxRaiseTo: number; shortAllInOnly: boolean } | null;
};
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'complete';
export type HandSeat = EngineSeat & {
  stack: number;
  streetContribution: number;
  totalContribution: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  lastFaced: number;
  manualAction: boolean;
  holeCards: readonly [Card, Card];
};
export type HandState = {
  seats: readonly HandSeat[];
  buttonSeat: number;
  smallBlind: number;
  bigBlind: number;
  street: Street;
  board: readonly Card[];
  deck: readonly Card[];
  deckIndex: number;
  currentBet: number;
  lastFullRaiseIncrement: number;
  actorAccountId: string | null;
  version: number;
};
export type EngineSettlement = {
  contributions: Record<string, number>;
  payouts: Record<string, number>;
  finalStacks: number[];
  manualActionAccountIds: string[];
  revealedCards: { accountId: string; cards: readonly [Card, Card] }[];
  pots: PotResult['pots'];
};
export type EngineTransition = { state: HandState; settlement: EngineSettlement | null };
