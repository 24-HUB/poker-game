'use client';

import { resultSchema, walletViewSchema, type WalletView } from '@poker/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiGet } from '../../lib/api';

const walletResultSchema = resultSchema(walletViewSchema);

export function useWallet(accountId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!accountId) return;
    let timer: number;
    const schedule = () => {
      const now = Date.now();
      const nextMidnight = Math.floor(now / 86_400_000) * 86_400_000 + 86_400_000;
      timer = window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['wallet', accountId] });
        schedule();
      }, nextMidnight - now + 100);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [accountId, queryClient]);

  return useQuery<WalletView>({
    queryKey: ['wallet', accountId], enabled: Boolean(accountId),
    queryFn: async () => {
      const response = await apiGet('/api/wallet', walletResultSchema);
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    refetchOnWindowFocus: true,
  });
}
