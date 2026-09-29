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
