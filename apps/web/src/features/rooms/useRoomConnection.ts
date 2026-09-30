'use client';

import type { GameCommand, GameMutationCommand, GameReply, Result, RoomCommand, RoomMutationCommand, RoomReply } from '@poker/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';

import { createGameSocket, type GameSocket } from '../../lib/socket';
import { useSession } from '../auth/SessionBoundary';
import { clearPendingCommand, clearPendingGameCommand, readPendingCommand, readPendingGameCommand,
  storePendingCommand, storePendingGameCommand } from './pendingCommand';
import { roomStore } from './roomStore';
import { gameStore } from './gameStore';

export type RoomConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'unavailable';

const uncertainReply: Result<RoomReply> = {
  data: null,
  error: { code: 'COMMAND_UNCERTAIN', message: 'The server may have received that command. Reconnect to reconcile it.' },
};
const uncertainGameReply: Result<GameReply> = { data: null, error: uncertainReply.error };

export function useRoomConnection(roomId: string | null) {
  const queryClient = useQueryClient();
  const { session, refresh: refreshSession } = useSession();
  const room = useStore(roomStore, (state) => state.room);
  const pendingCommand = useStore(roomStore, (state) => state.pendingCommand);
  const game = useStore(gameStore, (state) => state.game);
  const [pendingGameCommand, setPendingGameCommand] = useState<GameMutationCommand | null>(null);
  const [status, setStatus] = useState<RoomConnectionStatus>('connecting');
  const [authorityBootId, setAuthorityBootId] = useState<string | null>(null);
  const [uncertainCommandId, setUncertainCommandId] = useState<string | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const bootIdRef = useRef<string | null>(null);
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;

  const sync = useCallback(async (): Promise<Result<RoomReply>> => {
    const socket = socketRef.current;
    if (!socket?.connected || !roomId) return unavailableReply();
    return emitWithAck(socket, 'room:sync', { type: 'room:sync', roomId });
  }, [roomId]);

  useEffect(() => {
    if (!accountId) {
      roomStore.getState().clear();
      gameStore.getState().clear();
      setPendingGameCommand(null);
      setUncertainCommandId(null);
      setStatus('closed');
      return;
    }
    const socket = createGameSocket();
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connection:ready', ({ authorityBootId: nextBootId }) => {
      void queryClient.invalidateQueries({ queryKey: ['wallet', accountId] });
      bootIdRef.current = nextBootId;
      setAuthorityBootId(nextBootId);
      setStatus('connected');
      const stored = readPendingCommand(accountId, sessionStorage);
      setPendingGameCommand(roomId ? readPendingGameCommand(accountId, roomId, sessionStorage) : null);
      roomStore.getState().setPendingCommand(stored);
      setUncertainCommandId(stored?.commandId ?? null);
      if (roomId) void (async () => {
        const result = await emitWithAck(socket, 'room:sync', { type: 'room:sync', roomId });
        if (!result.data?.room) return;
        roomStore.getState().applySnapshot(result.data.room);
        const previous = gameStore.getState();
        gameStore.getState().setBoundary(accountId, roomId,
          result.data.room.sessionId ?? (previous.roomId === roomId ? previous.sessionId : null), nextBootId);
        const synchronized = await emitGameWithAck(socket, 'game:sync', { type: 'game:sync', roomId });
        if (synchronized.data?.game) {
          const view = synchronized.data.game;
          if (result.data.room.sessionId === view.sessionId ||
            (result.data.room.sessionId === null && view.sessionPhase === 'ended')) {
            gameStore.getState().setBoundary(accountId, roomId, view.sessionId, nextBootId);
            gameStore.getState().applySnapshot(view);
          }
        }
      })();
    });
    socket.on('room:snapshot', (view) => {
      if (view.roomId !== roomId) return;
      roomStore.getState().applySnapshot(view);
      const previous = gameStore.getState();
      gameStore.getState().setBoundary(accountId, roomId,
        view.sessionId ?? (previous.roomId === roomId ? previous.sessionId : null), bootIdRef.current);
    });
    socket.on('game:snapshot', (view) => gameStore.getState().applySnapshot(view));
    socket.on('account:changed', () => { void queryClient.invalidateQueries({ queryKey: ['wallet', accountId] }); });
    socket.on('room:closed', ({ roomId: closedRoomId, reason }) => {
      if (roomStore.getState().room?.roomId === closedRoomId || roomId === closedRoomId) {
        roomStore.getState().close(reason);
        gameStore.getState().clear();
        clearPendingGameCommand(sessionStorage);
        setPendingGameCommand(null);
        setStatus('closed');
      }
    });
    socket.on('disconnect', (reason) => {
      gameStore.getState().clear();
      setStatus(reason === 'io client disconnect' ? 'closed' : 'reconnecting');
    });
    socket.on('connect_error', () => setStatus('unavailable'));
    socket.connect();

    return () => {
      socketRef.current = null;
      bootIdRef.current = null;
      gameStore.getState().clear();
      socket.close();
    };
  }, [accountId, roomId, queryClient]);

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
      gameStore.getState().clear();
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

  const sendGame = useCallback(async (command: GameCommand): Promise<Result<GameReply>> => {
    const socket = socketRef.current;
    if (!socket?.connected || !accountId || !roomId) return unavailableGameReply();
    if (command.type !== 'game:sync') {
      setPendingGameCommand(command);
      storePendingGameCommand(accountId, command, sessionStorage);
    }
    const result = await emitGameWithAck(socket, command.type, command);
    if (result.error?.code === 'COMMAND_UNCERTAIN') return result;
    if (command.type !== 'game:sync') {
      setPendingGameCommand(null);
      clearPendingGameCommand(sessionStorage);
    }
    if (result.error?.code === 'UNAUTHENTICATED') {
      gameStore.getState().clear();
      roomStore.getState().clear();
      await refreshSession();
    }
    if (result.data?.game) {
      const view = result.data.game;
      const roomSession = roomStore.getState().room?.sessionId;
      if (roomSession === view.sessionId || command.type === 'session:start' ||
        (roomSession === null && view.sessionPhase === 'ended')) {
        gameStore.getState().setBoundary(accountId, roomId, view.sessionId, bootIdRef.current);
        gameStore.getState().applySnapshot(view);
      }
    }
    return result;
  }, [accountId, roomId, refreshSession]);

  const retryPendingGame = useCallback((): Promise<Result<GameReply>> => {
    const command = pendingGameCommand;
    return command ? sendGame(command) : Promise.resolve(unavailableGameReply());
  }, [pendingGameCommand, sendGame]);

  const syncGame = useCallback((): Promise<Result<GameReply>> => sendGame({ type: 'game:sync', roomId: roomId ?? '' }),
    [sendGame, roomId]);

  return {
    status,
    room,
    game,
    pendingCommand,
    pendingGameCommand,
    authorityBootId,
    canRetryPending: pendingCommand !== null && pendingCommand.commandId === uncertainCommandId,
    retryPending,
    send,
    sync,
    sendGame,
    syncGame,
    retryPendingGame,
  };
}

function emitGameWithAck(socket: GameSocket, event: GameCommand['type'], command: GameCommand): Promise<Result<GameReply>> {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => { settled = true; resolve(uncertainGameReply); }, 5_000);
    const emitter = socket as unknown as {
      emit: (name: GameCommand['type'], payload: GameCommand, ack: (reply: Result<GameReply>) => void) => void;
    };
    emitter.emit(event, command, (reply) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(reply);
    });
  });
}

export function createGameMutationCommand<Type extends GameMutationCommand['type']>(
  type: Type, authorityBootId: string,
  fields: Omit<Extract<GameMutationCommand, { type: Type }>, 'type' | 'commandId' | 'authorityBootId' | 'issuedAt'>,
): Extract<GameMutationCommand, { type: Type }> {
  return { type, commandId: crypto.randomUUID(), authorityBootId, issuedAt: new Date().toISOString(), ...fields } as Extract<GameMutationCommand, { type: Type }>;
}

function unavailableGameReply(): Result<GameReply> {
  return { data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'The private game connection is unavailable.' } };
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
