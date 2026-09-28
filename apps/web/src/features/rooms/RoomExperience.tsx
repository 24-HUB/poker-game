'use client';

import type { RoomMutationCommand } from '@poker/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from 'zustand';

import { useSession } from '../auth/SessionBoundary';
import { RoomLobby } from './RoomLobby';
import { roomStore } from './roomStore';
import { createMutationCommand, useRoomConnection } from './useRoomConnection';

export function RoomExperience({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { session } = useSession();
  const invitation = useStore(roomStore, (state) => state.invitation);
  const { room, status, pendingCommand, authorityBootId, send } = useRoomConnection(roomId);
  const [message, setMessage] = useState<string | null>(null);
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;
  const currentRoom = room?.roomId === roomId ? room : null;
  const invitationUrl = invitation
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/#invite=${encodeURIComponent(invitation.token)}`
    : null;

  if (!accountId) return <p className="session-boundary">Sign in to enter this private room.</p>;
  if (!currentRoom) {
    return (
      <div className="session-boundary" role="status">
        <p>{status === 'unavailable' ? 'The game server is unavailable.' : 'Synchronizing your private room…'}</p>
        <button type="button" onClick={() => router.push('/')}>Return to lobby</button>
      </div>
    );
  }

  async function run(command: RoomMutationCommand) {
    setMessage(null);
    const result = await send(command);
    if (result.error) {
      setMessage(result.error.message);
      return result;
    }
    if (result.data.invitation) roomStore.getState().setInvitation(result.data.invitation);
    return result;
  }

  function requireBootId() {
    if (authorityBootId) return authorityBootId;
    setMessage('The private room connection is still starting.');
    return null;
  }

  return (
    <RoomLobby
      accountId={accountId}
      room={currentRoom}
      status={status}
      pending={pendingCommand !== null}
      invitationUrl={invitationUrl}
      message={message}
      onTakeSeat={(seat) => {
        const bootId = requireBootId();
        if (bootId) void run(createMutationCommand('room:takeSeat', bootId, {
          roomId,
          seat,
          controlEpoch: currentRoom.control.epoch,
        }));
      }}
      onRotateInvitation={() => {
        const bootId = requireBootId();
        if (bootId) void run(createMutationCommand('room:rotateInvite', bootId, {
          roomId,
          controlEpoch: currentRoom.control.epoch,
        }));
      }}
      onClaimControl={() => {
        const bootId = requireBootId();
        if (bootId) void run(createMutationCommand('room:claimControl', bootId, { roomId }));
      }}
      onLeave={() => {
        const bootId = requireBootId();
        if (!bootId) return;
        void run(createMutationCommand('room:leave', bootId, {
          roomId,
          controlEpoch: currentRoom.control.epoch,
        })).then((result) => {
          if (!result.error) {
            roomStore.getState().clear();
            router.push('/');
          }
        });
      }}
    />
  );
}
