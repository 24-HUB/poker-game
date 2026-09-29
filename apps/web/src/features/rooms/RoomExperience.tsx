'use client';

import type { GameMutationCommand, PokerAction, RoomMutationCommand } from '@poker/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';

import { useSession } from '../auth/SessionBoundary';
import { RoomLobby } from './RoomLobby';
import { PokerTable } from './PokerTable';
import { roomStore } from './roomStore';
import { createGameMutationCommand, createMutationCommand, useRoomConnection } from './useRoomConnection';

export function RoomExperience({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { session } = useSession();
  const invitation = useStore(roomStore, (state) => state.invitation);
  const interruption = useStore(roomStore, (state) => state.interruption);
  const {
    room,
    game,
    status,
    pendingCommand,
    pendingGameCommand,
    authorityBootId,
    canRetryPending,
    retryPending,
    send,
    sendGame,
    retryPendingGame,
  } = useRoomConnection(roomId);
  const [message, setMessage] = useState<string | null>(null);
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;
  const currentRoom = room?.roomId === roomId ? room : null;
  const invitationUrl = invitation
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/#invite=${encodeURIComponent(invitation.token)}`
    : null;

  useEffect(() => {
    if (interruption) router.replace('/');
  }, [interruption, router]);

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
  const activeRoom = currentRoom;

  async function runGame(command: GameMutationCommand) {
    setMessage(null);
    const result = await sendGame(command);
    if (result.error) setMessage(result.error.message);
    return result;
  }

  function requireBootId() {
    if (authorityBootId) return authorityBootId;
    setMessage('The private room connection is still starting.');
    return null;
  }

  function startSession() {
    const bootId = requireBootId();
    if (bootId) void runGame(createGameMutationCommand('session:start', bootId, {
      roomId, controlEpoch: activeRoom.control.epoch,
    }));
  }

  function endSession() {
    const bootId = requireBootId();
    if (!bootId || !game || !window.confirm('End the session after the current hand?')) return;
    void runGame(createGameMutationCommand('session:end', bootId, {
      roomId, controlEpoch: activeRoom.control.epoch, sessionId: game.sessionId,
    }));
  }

  function act(action: PokerAction) {
    const bootId = requireBootId();
    if (!bootId || !game?.handId) return;
    void runGame(createGameMutationCommand('game:action', bootId, {
      roomId, controlEpoch: game.control.epoch, sessionId: game.sessionId,
      handId: game.handId, expectedGameVersion: game.gameVersion, action,
    }));
  }

  function leave() {
    const bootId = requireBootId();
    if (!bootId || !window.confirm(activeRoom.phase === 'playing'
      ? 'Leave this room? Your seat stays in the current session until it ends.'
      : 'Leave this private room?')) return;
    void run(createMutationCommand('room:leave', bootId, {
      roomId, controlEpoch: activeRoom.control.epoch,
    })).then((result) => {
      if (!result.error) { roomStore.getState().clear(); router.push('/'); }
    });
  }

  function claimControl() {
    const bootId = requireBootId();
    if (bootId) void run(createMutationCommand('room:claimControl', bootId, { roomId }));
  }

  if (currentRoom.phase === 'playing' || game?.sessionPhase === 'ended') {
    return <PokerTable room={currentRoom} game={game} accountId={accountId} status={status}
      pending={pendingGameCommand !== null} message={message} onAction={act} onEnd={endSession}
      onStart={startSession} onLeave={leave} onClaimControl={claimControl}
      onRetryPending={() => void retryPendingGame().then((result) => {
        if (result.error) setMessage(result.error.message);
      })} />;
  }

  return (
    <RoomLobby
      accountId={accountId}
      room={currentRoom}
      status={status}
      pending={pendingCommand !== null}
      invitationUrl={invitationUrl}
      message={message}
      canRetryPending={canRetryPending}
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
        claimControl();
      }}
      onLeave={leave}
      onStart={startSession}
      onRetryPending={() => {
        setMessage(null);
        void retryPending().then((result) => {
          if (result.error) setMessage(result.error.message);
          else if (result.data.invitation) roomStore.getState().setInvitation(result.data.invitation);
        });
      }}
    />
  );
}
