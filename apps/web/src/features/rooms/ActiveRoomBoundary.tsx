'use client';
import type { CurrentRoom } from '@poker/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { currentRoomKey, readCurrentRoom } from '../../lib/current-room';
import { useSession } from '../auth/SessionBoundary';
import { AccountAccess } from '../auth/AccountAccess';
import { roomStore } from './roomStore';

type RoomBoundaryValue = {
  current: CurrentRoom | null;
  locked: boolean;
  registerLeave: (handler: (destination: string) => void) => () => void;
  navigate: (destination: string) => void;
  refresh: () => void;
  released: () => Promise<void>;
};
const RoomBoundaryContext = createContext<RoomBoundaryValue | null>(null);
export const useActiveRoom = () => useContext(RoomBoundaryContext);

export function ActiveRoomBoundary({ children, reader = readCurrentRoom }: { children: ReactNode; reader?: typeof readCurrentRoom }) {
  const { session, refresh: refreshSession } = useSession();
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const leaveHandler = useRef<((destination: string) => void) | null>(null);
  const liveRoom = useStore(roomStore, (state) => state.accountId === accountId ? state.room : null);
  const query = useQuery({
    queryKey: currentRoomKey(accountId), enabled: accountId !== null,
    queryFn: async () => {
      const before = roomStore.getState();
      const result = await reader();
      const after = roomStore.getState();
      if (!result.error && result.data === null && before.room && before.room === after.room && after.accountId === accountId && after.pendingCommand?.type !== 'room:leave') {
        roomStore.getState().close('RESTARTED');
      }
      if (!result.error && result.data && before.room && before.room === after.room && after.accountId === accountId && after.room?.roomId === result.data.roomId && after.room.phase !== result.data.phase) {
        roomStore.setState({ room: { ...after.room, phase: result.data.phase } });
      }
      return result;
    }, refetchInterval: 5_000,
  });
  const current = liveRoom ? { roomId: liveRoom.roomId, title: liveRoom.title, phase: liveRoom.phase } : query.data?.data ?? null;
  const locked = accountId !== null && current?.phase === 'playing';
  const roomPath = current ? `/rooms/${encodeURIComponent(current.roomId)}` : null;
  const recovery = pathname === '/reset-password';
  const redirect = locked && !recovery && pathname !== roomPath;

  useEffect(() => { void client.invalidateQueries({ queryKey: currentRoomKey(accountId) }); }, [accountId, pathname, client]);
  useEffect(() => {
    if (redirect && roomPath) router.replace(roomPath);
  }, [redirect, roomPath, router]);
  useEffect(() => {
    if (query.data?.error?.code === 'UNAUTHENTICATED') void refreshSession();
  }, [query.data, accountId]);

  const value: RoomBoundaryValue = {
    current, locked,
    registerLeave: (handler) => { leaveHandler.current = handler; return () => { if (leaveHandler.current === handler) leaveHandler.current = null; }; },
    navigate: (destination) => {
      if (locked) leaveHandler.current?.(destination);
      else router.push(destination);
    },
    refresh: () => { void client.invalidateQueries({ queryKey: currentRoomKey(accountId) }); },
    released: async () => {
      await client.cancelQueries({ queryKey: currentRoomKey(accountId) });
      client.setQueryData(currentRoomKey(accountId), { data: null, error: null });
    },
  };
  const checking = accountId !== null && !recovery && !liveRoom && (query.isPending || query.data?.error || query.isError);
  return <RoomBoundaryContext.Provider value={value}>
    {checking || redirect ? <div className="session-boundary" role="status">
      <AccountAccess />
      <p>{query.data?.error || query.isError ? 'Your current room could not be checked. Reconnect to continue.' : 'Recovering your current room…'}</p>
      {query.data?.error || query.isError ? <button type="button" onClick={() => void query.refetch()}>Retry room connection</button> : null}
    </div> : children}
  </RoomBoundaryContext.Provider>;
}
