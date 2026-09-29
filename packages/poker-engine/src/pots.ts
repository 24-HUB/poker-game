import { compareRanks } from './evaluate.js';
import type { PotInput, PotResult, PotSeat } from './types.js';

function safeAdd(left: number, right: number): number {
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) throw new RangeError('Chip overflow');
  return sum;
}

export function settlePots({ seats, buttonSeat }: PotInput): PotResult {
  if (!Number.isInteger(buttonSeat) || buttonSeat < 0 || buttonSeat > 5) throw new RangeError('Invalid button');
  if (seats.length < 2 || seats.length > 6) throw new RangeError('Invalid seat count');
  if (new Set(seats.map((seat) => seat.accountId)).size !== seats.length ||
      new Set(seats.map((seat) => seat.seat)).size !== seats.length) throw new RangeError('Duplicate seat');
  for (const seat of seats) {
    if (!seat.accountId || !Number.isInteger(seat.seat) || seat.seat < 0 || seat.seat > 5 ||
        !Number.isSafeInteger(seat.contribution) || seat.contribution < 0 ||
        (!seat.folded && !seat.rank)) throw new RangeError('Invalid pot seat');
  }
  const contributions = new Map(seats.map((seat) => [seat.accountId, seat.contribution]));
  const totalPayouts: Record<string, number> = Object.fromEntries(seats.map((seat) => [seat.accountId, 0]));
  const uncalledReturns: PotResult['uncalledReturns'] = [];
  const descending = [...seats].sort((a, b) => b.contribution - a.contribution);
  if (descending[0]!.contribution > descending[1]!.contribution) {
    const amount = descending[0]!.contribution - descending[1]!.contribution;
    const accountId = descending[0]!.accountId;
    contributions.set(accountId, descending[1]!.contribution);
    uncalledReturns.push({ accountId, amount });
    totalPayouts[accountId] = amount;
  }
  const levels = [...new Set(contributions.values())].filter((level) => level > 0).sort((a, b) => a - b);
  const pots: PotResult['pots'] = [];
  let previous = 0;
  for (const level of levels) {
    const contributors = seats.filter((seat) => contributions.get(seat.accountId)! >= level);
    const amount = (level - previous) * contributors.length;
    if (!Number.isSafeInteger(amount)) throw new RangeError('Pot overflow');
    const eligible = contributors.filter((seat) => !seat.folded);
    if (!eligible.length) throw new RangeError('Pot has no eligible winner');
    let best = eligible[0]!.rank!;
    for (const seat of eligible.slice(1)) if (compareRanks(seat.rank!, best) > 0) best = seat.rank!;
    const winners = eligible.filter((seat) => compareRanks(seat.rank!, best) === 0)
      .sort((a, b) => ((a.seat - buttonSeat + 5) % 6) - ((b.seat - buttonSeat + 5) % 6));
    const base = Math.floor(amount / winners.length);
    const odd = amount % winners.length;
    const payouts = winners.map((winner, index) => ({ accountId: winner.accountId, amount: base + (index < odd ? 1 : 0) }));
    for (const payout of payouts) totalPayouts[payout.accountId] = safeAdd(totalPayouts[payout.accountId]!, payout.amount);
    pots.push({ amount, eligibleAccountIds: eligible.map((seat) => seat.accountId), winners: winners.map((seat) => seat.accountId), payouts });
    previous = level;
  }
  return { uncalledReturns, pots, totalPayouts };
}
