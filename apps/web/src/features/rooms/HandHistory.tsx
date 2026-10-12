'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { readHandHistory } from '../../lib/hand-history';
import { HandReward } from '../wallet/HandReward';

export function HandHistory({ accountId, roomId, sessionId, latestHandId, names = {}, reader = readHandHistory }: {
  accountId: string; roomId: string; sessionId: string; latestHandId?: string;
  names?: Record<string, string>; reader?: typeof readHandHistory;
}) {
  const [open, setOpen] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ['hand-history', accountId, roomId, sessionId], enabled: open,
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await reader(roomId, sessionId, pageParam);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    getNextPageParam: (page) => page.nextBeforeHandNumber ?? undefined,
  });
  useEffect(() => { if (open) void query.refetch(); }, [latestHandId]);
  const hands = query.data?.pages.flatMap((page) => page.hands) ?? [];
  return <section className="hand-history" aria-label="Completed hands">
    <button type="button" className="text-button" aria-expanded={open} aria-controls="hand-history-content" onClick={() => setOpen(!open)}>Hand history</button>
    {open ? <div id="hand-history-content">
      {query.isPending ? <p role="status">Loading completed hands…</p> : null}
      {query.isError ? <div role="status"><p>Completed hands could not be loaded. Try again.</p><button type="button" className="secondary-button" onClick={() => void query.refetch()}>Retry hand history</button></div> : null}
      {!query.isPending && !query.isError && hands.length === 0 ? <p>No completed hands yet.</p> : null}
      <ol>{hands.map((hand) => <li key={hand.handId}>
        <h3>Hand {hand.handNumber}</h3>
        <p>Winner: {hand.winners.map((id) => names[id] ?? id).join(', ')}</p>
        <p>Payouts: {hand.payouts.filter((entry) => entry.amount > 0).map((entry) => `${names[entry.accountId] ?? entry.accountId}: ${entry.amount} chips`).join(' · ')}</p>
        <p>Final stacks: {hand.finalStacks.map((entry) => `${names[entry.accountId] ?? entry.accountId}: ${entry.amount}`).join(' · ')}</p>
        <HandReward receipt={hand.rewardReceipts?.find((receipt) => receipt.accountId === accountId)} />
      </li>)}</ol>
      {query.hasNextPage ? <button type="button" className="secondary-button" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>Load earlier hands</button> : null}
    </div> : null}
  </section>;
}
