import { useEffect, useCallback, useRef } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { GameAction } from '@poker/shared';
import { playChipSound, playWinSound, playCardFlipSound } from '../lib/sounds';

export function useGame() {
  const { setGameState, setMyCards, setConnectionStatus, setIsMyTurn, setWinners, setHandDescriptions, setChipUpdates, setAwaitingNextRound, setTurnTimer, tickTurn, clearTurn, setLastBetEvent, setWaitingPlayers } = useGameStore();
  const { user } = useAuthStore();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the turn countdown every second
  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      tickTurn();
    }, 1000);
  }, [tickTurn]);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  useEffect(() => {
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => { setConnectionStatus('disconnected'); stopTick(); clearTurn(); });
    socket.on('room:updated', (players) => setWaitingPlayers(players));
    
    socket.on('game:stateUpdate', (state) => {
      const prev = useGameStore.getState().gameState;

      // Detect bet events: find player whose totalContributed increased
      if (prev) {
        for (const player of state.players) {
          const prevPlayer = prev.players.find((p: { id: string }) => p.id === player.id);
          if (prevPlayer && player.totalContributed > prevPlayer.totalContributed) {
            const diff = player.totalContributed - prevPlayer.totalContributed;
            setLastBetEvent({ playerId: player.id, amount: diff });
            playChipSound();
            // Clear after animation (800ms)
            setTimeout(() => useGameStore.getState().setLastBetEvent(null), 800);
            break;
          }
        }
        // New community cards → card flip sound
        if (state.communityCards.length > prev.communityCards.length) {
          playCardFlipSound();
        }
      }

      setGameState(state);
      const myId = useAuthStore.getState().user?.id;
      setIsMyTurn(state.phase !== 'showdown' && !!myId && state.activePlayerId === myId);
    });

    socket.on('game:yourCards', (cards) => {
      setMyCards(cards);
      playCardFlipSound();
    });

    socket.on('game:started', () => {
      setWinners([]);
      setHandDescriptions({});
      setChipUpdates({});
      setMyCards([]);
      setAwaitingNextRound(false);
      clearTurn();
      stopTick();
    });

    socket.on('game:ended', ({ winners, handDescriptions, chipUpdates }) => {
      setWinners(winners);
      setHandDescriptions(handDescriptions);
      clearTurn();
      stopTick();
      if (winners && winners.length > 0) playWinSound();
      if (chipUpdates) {
        setChipUpdates(chipUpdates);
        const myId = useAuthStore.getState().user?.id;
        if (myId && chipUpdates[myId] !== undefined) {
          useAuthStore.getState().updateChips(chipUpdates[myId]);
        }
      }
    });

    socket.on('game:playerTurn', (playerId: string, timeoutMs: number) => {
      setTurnTimer(playerId, timeoutMs);
      startTick();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:updated');
      socket.off('game:stateUpdate');
      socket.off('game:yourCards');
      socket.off('game:started');
      socket.off('game:ended');
      socket.off('game:playerTurn');
      stopTick();
    };
  }, [setGameState, setMyCards, setConnectionStatus, setIsMyTurn, setWinners, setHandDescriptions, setChipUpdates, setAwaitingNextRound, setTurnTimer, tickTurn, clearTurn, setLastBetEvent, setWaitingPlayers, startTick, stopTick]);

  const sendAction = useCallback((action: GameAction) => {
    socket.emit('game:action', action);
    clearTurn();
    stopTick();
  }, [clearTurn, stopTick]);

  const sendChat = useCallback((msg: string) => {
    socket.emit('game:chat', msg);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    socket.emit('room:join', roomId);
  }, []);

  const ready = useCallback(() => {
    socket.emit('room:ready');
    useGameStore.getState().setAwaitingNextRound(true);
  }, []);

  return { sendAction, sendChat, joinRoom, ready };
}
