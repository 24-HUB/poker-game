import { useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { GameAction } from '../../../packages/shared/src/types/socket';

export function useGame() {
  const { setGameState, setMyCards, setConnectionStatus, setIsMyTurn, setWinners, setHandDescriptions } = useGameStore();
  const { user } = useAuthStore();

  useEffect(() => {
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    
    socket.on('game:stateUpdate', (state) => {
      setGameState(state);
      const myId = useAuthStore.getState().user?.id;
      setIsMyTurn(state.phase !== 'showdown' && !!myId && state.activePlayerId === myId);
    });

    socket.on('game:yourCards', (cards) => {
      setMyCards(cards);
    });

    socket.on('game:started', () => {
      // Reset state when a new hand begins
      setWinners([]);
      setHandDescriptions({});
      setMyCards([]);
    });

    socket.on('game:ended', ({ winners, handDescriptions }) => {
      setWinners(winners);
      setHandDescriptions(handDescriptions);
    });

    socket.on('game:playerTurn', (playerId, timeout) => {
      console.log(`Player turn: ${playerId}, timeout: ${timeout}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game:stateUpdate');
      socket.off('game:yourCards');
      socket.off('game:started');
      socket.off('game:ended');
      socket.off('game:playerTurn');
    };
  }, [setGameState, setMyCards, setConnectionStatus, setIsMyTurn, setWinners, setHandDescriptions]);

  const sendAction = useCallback((action: GameAction) => {
    socket.emit('game:action', action);
  }, []);

  const sendChat = useCallback((msg: string) => {
    socket.emit('game:chat', msg);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    socket.emit('room:join', roomId);
  }, []);

  const ready = useCallback(() => {
    socket.emit('room:ready');
  }, []);

  return { sendAction, sendChat, joinRoom, ready };
}
