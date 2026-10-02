'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createGameSocket } from '../../lib/socket';
import { useSession } from '../auth/SessionBoundary';

export function useAccountSync(accountId: string | null) {
  const queryClient = useQueryClient();
  const { refresh } = useSession();
  useEffect(() => {
    if (!accountId) return;
    const socket = createGameSocket();
    const invalidate = () => {
      for (const scope of ['wallet', 'collection', 'equipment']) void queryClient.invalidateQueries({ queryKey: [scope, accountId] });
    };
    socket.on('connection:ready', invalidate);
    socket.on('account:changed', invalidate);
    socket.on('disconnect', (reason) => { if (reason === 'io server disconnect') void refresh(); });
    socket.connect();
    return () => { socket.close(); };
  }, [accountId, queryClient, refresh]);
}
