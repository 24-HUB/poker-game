'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRoomConnection } from './useRoomConnection';

const ConnectionContext = createContext<ReturnType<typeof useRoomConnection> | null>(null);

// Layout lifetime preserves the socket assigned by create/join. Each tab keeps
// its own connection; taking control from another tab remains explicit.
export function RoomConnectionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const match = /^\/rooms\/([^/]+)$/.exec(pathname);
  const connection = useRoomConnection(match ? decodeURIComponent(match[1]!) : null);
  return <ConnectionContext.Provider value={connection}>{children}</ConnectionContext.Provider>;
}

export function useSharedRoomConnection() {
  const connection = useContext(ConnectionContext);
  if (!connection) throw new Error('RoomConnectionProvider is required');
  return connection;
}
