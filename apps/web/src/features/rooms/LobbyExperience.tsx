'use client';

import type { Result, RoomReply } from '@poker/contracts';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { useSession } from '../auth/SessionBoundary';
import {
  clearPendingInvitation,
  readInvitationFragment,
  readPendingInvitation,
  storePendingInvitation,
} from './invitation';
import { Lobby } from './Lobby';
import { roomStore } from './roomStore';
import { createMutationCommand, useRoomConnection } from './useRoomConnection';

const transientErrorCodes = new Set(['COMMAND_UNCERTAIN', 'SERVICE_UNAVAILABLE', 'RATE_LIMITED']);

export function LobbyExperience() {
  const router = useRouter();
  const { session } = useSession();
  const { status, pendingCommand, authorityBootId, canRetryPending, retryPending, send } = useRoomConnection(null);
  const interruption = useStore(roomStore, (state) => state.interruption);
  const [invitation, setInvitation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const automaticJoin = useRef<string | null>(null);
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;

  useEffect(() => {
    const fragmentInvitation = readInvitationFragment(window.location.hash);
    if (fragmentInvitation) {
      storePendingInvitation(fragmentInvitation, sessionStorage);
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(window.history.state, '', cleanUrl);
    }
    setInvitation(fragmentInvitation ?? readPendingInvitation(sessionStorage));
  }, []);

  const handleRoomResult = useCallback((result: Result<RoomReply>, attemptedInvitation?: string) => {
    if (result.error) {
      setError(result.error.message);
      if (attemptedInvitation && !transientErrorCodes.has(result.error.code)) {
        clearPendingInvitation(sessionStorage);
        setInvitation(null);
      }
      return;
    }
    setError(null);
    clearPendingInvitation(sessionStorage);
    setInvitation(null);
    roomStore.getState().setInvitation(result.data.invitation ?? null);
    if (result.data.room) router.push(`/rooms/${encodeURIComponent(result.data.room.roomId)}`);
  }, [router]);

  const joinRoom = useCallback(async (token: string) => {
    roomStore.getState().clearInterruption();
    if (!accountId) {
      storePendingInvitation(token, sessionStorage);
      setInvitation(token);
      setError('Sign in to use this private invitation. It will stay in this tab.');
      return;
    }
    if (!authorityBootId || status !== 'connected') {
      setError('The private room connection is still starting. Try again shortly.');
      return;
    }
    setError(null);
    const result = await send(createMutationCommand('room:join', authorityBootId, { token }));
    handleRoomResult(result, token);
  }, [accountId, authorityBootId, handleRoomResult, send, status]);

  useEffect(() => {
    if (!invitation || !accountId || !authorityBootId || status !== 'connected') return;
    const attemptKey = `${accountId}:${authorityBootId}:${invitation}`;
    if (automaticJoin.current === attemptKey) return;
    automaticJoin.current = attemptKey;
    void joinRoom(invitation);
  }, [accountId, authorityBootId, invitation, joinRoom, status]);

  async function createRoom(title: string) {
    roomStore.getState().clearInterruption();
    if (!accountId) {
      setError('Sign in before creating a private room.');
      return;
    }
    if (!authorityBootId || status !== 'connected') {
      setError('The private room connection is still starting. Try again shortly.');
      return;
    }
    setError(null);
    const result = await send(createMutationCommand('room:create', authorityBootId, { title }));
    handleRoomResult(result);
  }

  return (
    <Lobby
      onCreate={createRoom}
      onJoin={joinRoom}
      pending={pendingCommand !== null}
      error={error ?? interruption}
      initialInvitation={invitation}
      canRetryPending={canRetryPending}
      onRetryPending={async () => {
        const attemptedInvitation = pendingCommand?.type === 'room:join' ? pendingCommand.token : undefined;
        handleRoomResult(await retryPending(), attemptedInvitation);
      }}
    />
  );
}
