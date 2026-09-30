import type { RewardReceipt } from '@poker/contracts';

export function HandReward({ receipt }: { receipt?: RewardReceipt }) {
  if (!receipt) return <p>Ticket reward not confirmed for this hand.</p>;
  const earned = receipt.grantedParticipation + receipt.grantedBonus;
  if (receipt.reason === 'NOT_DEALT_IN') return <p>No tickets: you were not dealt into this hand.</p>;
  if (receipt.reason === 'NO_MANUAL_ACTION') return <p>No tickets: make a manual action during a hand to qualify.</p>;
  if (receipt.reason === 'DAILY_CAP') return <p>No tickets: you reached today’s 20-ticket earning cap (UTC).</p>;
  return <p role="status">+{earned} {earned === 1 ? 'ticket' : 'tickets'} earned
    {receipt.grantedBonus ? ` · ${receipt.grantedBonus} positive-net bonus` : ''}
    {receipt.requestedBonus > receipt.grantedBonus ? ' · daily cap limited the bonus' : ''}</p>;
}
