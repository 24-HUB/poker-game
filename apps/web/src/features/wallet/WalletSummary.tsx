'use client';

import { useWallet } from './useWallet';

export function WalletSummary({ accountId }: { accountId: string }) {
  const wallet = useWallet(accountId);
  if (wallet.isPending) return <span className="wallet-summary" role="status">Tickets loading…</span>;
  if (wallet.isError) return <button className="wallet-summary" type="button" onClick={() => void wallet.refetch()}>Tickets unavailable · Retry</button>;
  return <span className="wallet-summary" aria-label={`${wallet.data.balance} tickets, ${wallet.data.remainingToday} can be earned today`}>
    <strong>{wallet.data.balance}</strong> tickets <small>{wallet.data.remainingToday} left today (UTC)</small>
  </span>;
}
