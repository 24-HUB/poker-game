'use client';

import type { Result, RoomCommand, RoomMutationCommand, RoomReply } from '@poker/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { createGameSocket, type GameSocket } from '../../lib/socket';
import { useSession } from '../auth/SessionBoundary';
import { clearPendingCommand, readPendingCommand, storePendingCommand } from './pendingCommand';
import { roomStore } from './roomStore';

export type RoomConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'unavailable';

const uncertainReply: Result<RoomReply> = {
  data: null,
  error: { code: 'COMMAND_UNCERTAIN', message: 'The server may have received that command. Reconnect to reconcile it.' },
};

export function useRoomConnection(roomId: string | null) {
  const { session, refresh: refreshSession } = useSession();
  const room = useStore(roomStore, (state) => state.room);
  const pendingCommand = useStore(roomStore, (state) => state.pendingCommand);
  const [status, setStatus] = useState<RoomConnectionStatus>('connecting');
  const [authorityBootId, setAuthorityBootId] = useState<string | null>(null);
  const [uncertainCommandId, setUncertainCommandId] = useState<string | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;

  const sync = useCallback(async (): Promise<Result<RoomReply>> => {
    const socket = socketRef.current;
    if (!socket?.connected || !roomId) return unavailableReply();
    return emitWithAck(socket, 'room:sync', { type: 'room:sync', roomId });
  }, [roomId]);

  useEffect(() => {
    if (!accountId) {
      roomStore.getState().clear();
      setUncertainCommandId(null);
      setStatus('closed');
      return;
    }
    const socket = createGameSocket();
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connection:ready', ({ authorityBootId: nextBootId }) => {
      setAuthorityBootId(nextBootId);
      setStatus('connected');
      const stored = readPendingCommand(accountId, sessionStorage);
      roomStore.getState().setPendingCommand(stored);
      setUncertainCommandId(stored?.commandId ?? null);
      if (roomId) void emitWithAck(socket, 'room:sync', { type: 'room:sync', roomId }).then((result) => {
        if (result.data?.room) roomStore.getState().applySnapshot(result.data.room);
      });
    });
    socket.on('room:snapshot', (view) => roomStore.getState().applySnapshot(view));
    socket.on('room:closed', ({ roomId: closedRoomId, reason }) => {
      if (roomStore.getState().room?.roomId === closedRoomId || roomId === closedRoomId) {
        roomStore.getState().close(reason);
        setStatus('closed');
      }
    });
    socket.on('disconnect', (reason) => {
      setStatus(reason === 'io client disconnect' ? 'closed' : 'reconnecting');
    });
    socket.on('connect_error', () => setStatus('unavailable'));
    socket.connect();

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [accountId, roomId]);

  const send = useCallback(async (command: RoomCommand): Promise<Result<RoomReply>> => {
    const socket = socketRef.current;
    if (!socket?.connected || !accountId) return unavailableReply();
    if (command.type !== 'room:sync') {
      setUncertainCommandId(null);
      roomStore.getState().setPendingCommand(command);
      storePendingCommand(accountId, command, sessionStorage);
    }
    const result = await emitWithAck(socket, command.type, command);
    if (result.error?.code === 'COMMAND_UNCERTAIN') {
      if (command.type !== 'room:sync') setUncertainCommandId(command.commandId);
      return result;
    }
    if (command.type !== 'room:sync') {
      roomStore.getState().setPendingCommand(null);
      setUncertainCommandId(null);
      clearPendingCommand(sessionStorage);
    }
    if (result.error?.code === 'UNAUTHENTICATED') {
      roomStore.getState().clear();
      await refreshSession();
      return result;
    }
    if (result.data?.room) roomStore.getState().applySnapshot(result.data.room);
    return result;
  }, [accountId, refreshSession]);

  const retryPending = useCallback((): Promise<Result<RoomReply>> => {
    const command = roomStore.getState().pendingCommand;
    return command ? send(command) : Promise.resolve(unavailableReply());
  }, [send]);

  return {
    status,
    room,
    pendingCommand,
    authorityBootId,
    canRetryPending: pendingCommand !== null && pendingCommand.commandId === uncertainCommandId,
    retryPending,
    send,
    sync,
  };
}

function emitWithAck(
  socket: GameSocket,
  event: RoomCommand['type'],
  command: RoomCommand,
): Promise<Result<RoomReply>> {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      resolve(uncertainReply);
    }, 5_000);
    const emitter = socket as unknown as {
      emit: (name: RoomCommand['type'], payload: RoomCommand, ack: (reply: Result<RoomReply>) => void) => void;
    };
    emitter.emit(event, command, (reply) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(reply);
    });
  });
}

export function createMutationCommand<Type extends RoomMutationCommand['type']>(
  type: Type,
  authorityBootId: string,
  fields: Omit<Extract<RoomMutationCommand, { type: Type }>, 'type' | 'commandId' | 'authorityBootId' | 'issuedAt'>,
): Extract<RoomMutationCommand, { type: Type }> {
  return {
    type,
    commandId: crypto.randomUUID(),
    authorityBootId,
    issuedAt: new Date().toISOString(),
    ...fields,
  } as Extract<RoomMutationCommand, { type: Type }>;
}

function unavailableReply(): Result<RoomReply> {
  return {
    data: null,
    error: { code: 'SERVICE_UNAVAILABLE', message: 'The private room connection is unavailable.' },
  };
}
