import type { RewardReceipt } from '@poker/contracts';
import { Ticket } from 'lucide-react';

export function HandReward({ receipt, announce = true, mode }: { receipt?: RewardReceipt; announce?: boolean; mode?: 'standard' | 'practice' }) {
  if (mode === 'practice') return <p>Practice hand · No tickets earned.</p>;
  if (!receipt) return <p>Ticket reward not confirmed for this hand.</p>;
  const earned = receipt.grantedParticipation + receipt.grantedBonus;
  if (receipt.reason === 'NOT_DEALT_IN') return <p>No tickets: you were not dealt into this hand.</p>;
  if (receipt.reason === 'NO_MANUAL_ACTION') return <p className="ticket-eligibility"><Ticket aria-hidden="true" />Earn cosmetic tickets by tapping Fold, Check, Call, Bet or Raise. An automatic timeout is not a manual action.</p>;
  if (receipt.reason === 'DAILY_CAP') return <p>No tickets: you reached today’s 20-ticket earning cap (UTC).</p>;
  return <p role={announce ? 'status' : undefined}>+{earned} {earned === 1 ? 'ticket' : 'tickets'} earned
    {receipt.grantedBonus ? ` · ${receipt.grantedBonus} positive-net bonus` : ''}
    {receipt.requestedBonus > receipt.grantedBonus ? ' · daily cap limited the bonus' : ''}</p>;
}
