'use client';

import type { GameMutationCommand, PokerAction, RoomMutationCommand } from '@poker/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { useSession } from '../auth/SessionBoundary';
import { RoomLobby } from './RoomLobby';
import { PokerTable } from './PokerTable';
import { useSharedRoomConnection } from './RoomConnectionProvider';
import { roomStore } from './roomStore';
import { createGameMutationCommand, createMutationCommand } from './useRoomConnection';
import { useActiveRoom } from './ActiveRoomBoundary';
import { HandHistory } from './HandHistory';

export function RoomExperience({ roomId }: { roomId: string }) {
  const router = useRouter();
  const boundary = useActiveRoom();
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
    retrySynchronization,
  } = useSharedRoomConnection();
  const [message, setMessage] = useState<string | null>(null);
  const [manageSeats, setManageSeats] = useState(false);
  const [historyOpenRequest, setHistoryOpenRequest] = useState<{ scope: string; revision: number } | null>(null);
  const leaveDestination = useRef('/');
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;
  const currentRoom = room?.roomId === roomId ? room : null;
  const invitationCode = invitation?.token ?? null;

  useEffect(() => {
    if (interruption) router.replace('/');
  }, [interruption, router]);
  useEffect(() => boundary?.registerLeave((destination) => { if (currentRoom) leave(destination); }));

  if (!accountId) return <p className="session-boundary">Sign in to enter this private room.</p>;
  if (!currentRoom) {
    return (
      <div className="session-boundary" role="status">
        <p>{status === 'unavailable' ? 'The game server is unavailable.' : 'Synchronizing your private room…'}</p>
        {status === 'unavailable' ? <button type="button" onClick={retrySynchronization}>Retry table synchronization</button> : null}
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
  const recovery = status === 'unavailable' ? <p role="status">The table could not be synchronized. <button type="button" onClick={retrySynchronization}>Retry table synchronization</button></p> : null;

  async function runGame(command: GameMutationCommand) {
    setMessage(null);
    const result = await sendGame(command);
    if (result.error) {
      setMessage(result.error.message);
      if (result.error.code !== 'COMMAND_UNCERTAIN') await sendGame({ type: 'game:sync', roomId });
    }
    return result;
  }

  function requireBootId() {
    if (authorityBootId) return authorityBootId;
    setMessage('The private room connection is still starting.');
    return null;
  }

  function startSession() {
    setManageSeats(false);
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

  function leave(destination = '/') {
    if (pendingCommand) { setMessage('Reconcile the pending room command before leaving.'); return; }
    const bootId = requireBootId();
    const activeHand = activeRoom.phase === 'playing' && game?.handId &&
      game.handPhase !== null && !['result', 'settling'].includes(game.handPhase);
    if (!bootId || (activeRoom.phase === 'playing' && !window.confirm(activeHand ? 'Leave table? Your seat stays in this session until it ends.' : 'Leave table and return to the lobby?'))) return;
    leaveDestination.current = destination;
    void run(createMutationCommand('room:leave', bootId, {
      roomId, controlEpoch: activeRoom.control.epoch,
    })).then(async (result) => { if (!result.error) await finishLeave(); });
  }

  async function finishLeave() {
    await boundary?.released();
    roomStore.getState().clear(); router.push(leaveDestination.current);
  }
  const exitControls = <div className="room-exit-controls">
    <button type="button" className="text-button" disabled={pendingCommand !== null} onClick={() => leave()}>Back to lobby</button>
    {pendingCommand ? <button type="button" className="secondary-button" disabled={!canRetryPending} onClick={() => {
      const leaving = pendingCommand.type === 'room:leave';
      void retryPending().then(async (result) => {
        if (result.error) setMessage(result.error.message);
        else if (leaving) await finishLeave();
      });
    }}>Reconcile pending room command</button> : null}
  </div>;

  function claimControl() {
    const bootId = requireBootId();
    if (bootId) void run(createMutationCommand('room:claimControl', bootId, { roomId }));
  }

  if (currentRoom.phase === 'playing' || game?.sessionPhase === 'ended' && !manageSeats) {
    return <>{recovery}{pendingCommand ? exitControls : null}<PokerTable room={currentRoom} game={game} accountId={accountId} status={status}
      pending={pendingGameCommand !== null} message={message} onAction={act} onEnd={endSession}
      onStart={startSession} onLeave={() => leave()} onClaimControl={claimControl} onManageSeats={() => setManageSeats(true)}
      onOpenHistory={() => { if (game) setHistoryOpenRequest((value) => ({ scope: `${accountId}:${roomId}:${game.sessionId}`, revision: (value?.revision ?? 0) + 1 })); }}
      onRetryPending={() => void retryPendingGame().then((result) => {
        if (result.error) setMessage(result.error.message);
      })} />
      {game ? <HandHistory key={`${accountId}:${game.sessionId}`} accountId={accountId} roomId={roomId} sessionId={game.sessionId}
        openRequest={historyOpenRequest?.revision ?? 0} requestScope={historyOpenRequest?.scope}
        latestHandId={game.handResult?.handId} names={Object.fromEntries(game.participants.map((player) => [player.accountId, player.displayName]))} /> : null}
    </>;
  }

  return (
    <>{recovery}{exitControls}
    <RoomLobby
      accountId={accountId}
      room={currentRoom}
      status={status}
      pending={pendingCommand !== null}
      invitationCode={invitationCode}
      message={message}
      canRetryPending={canRetryPending}
      onAddBot={(seat) => {
        const bootId = requireBootId();
        if (bootId) void run(createMutationCommand('room:addBot', bootId, { roomId, seat, controlEpoch: currentRoom.control.epoch }));
      }}
      onRemoveBot={(botId) => {
        const bootId = requireBootId();
        if (bootId) void run(createMutationCommand('room:removeBot', bootId, { roomId, botId, controlEpoch: currentRoom.control.epoch }));
      }}
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
      onLeave={() => leave()}
      onStart={startSession}
      onRetryPending={() => {
        setMessage(null);
        void retryPending().then((result) => {
          if (result.error) setMessage(result.error.message);
          else if (pendingCommand?.type === 'room:leave') void finishLeave();
          else if (result.data.invitation) roomStore.getState().setInvitation(result.data.invitation);
        });
      }}
    />
    </>
  );
}
