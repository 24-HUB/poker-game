import { create } from 'zustand';
import { GameState, Card } from '@poker/shared';

interface GameStore {
  gameState: GameState | null;
  myCards: Card[];
  isMyTurn: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  winners: { playerId: string; amount: number }[];
  handDescriptions: Record<string, string>;
  chipUpdates: Record<string, number>;
  awaitingNextRound: boolean;
  // Turn timer
  turnPlayerId: string | null;
  turnSecondsLeft: number;
  turnTotalSeconds: number;
  setTurnTimer: (playerId: string, ms: number) => void;
  tickTurn: () => void;
  clearTurn: () => void;
  // Waiting room — players currently connected before a game starts
  waitingPlayers: { id: string; username: string; chips: number }[];
  setWaitingPlayers: (players: { id: string; username: string; chips: number }[]) => void;
  // Chip animation trigger: playerId → amount just bet
  lastBetEvent: { playerId: string; amount: number } | null;
  setLastBetEvent: (ev: { playerId: string; amount: number } | null) => void;
  setGameState: (state: GameState | null) => void;
  setMyCards: (cards: Card[]) => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  setWinners: (winners: { playerId: string; amount: number }[]) => void;
  setHandDescriptions: (handDescriptions: Record<string, string>) => void;
  setChipUpdates: (chipUpdates: Record<string, number>) => void;
  setAwaitingNextRound: (v: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  myCards: [],
  isMyTurn: false,
  connectionStatus: 'disconnected',
  winners: [],
  handDescriptions: {},
  chipUpdates: {},
  awaitingNextRound: false,
  turnPlayerId: null,
  turnSecondsLeft: 0,
  turnTotalSeconds: 30,
  waitingPlayers: [],
  setWaitingPlayers: (waitingPlayers) => set({ waitingPlayers }),
  lastBetEvent: null,
  setTurnTimer: (playerId, ms) => set({ turnPlayerId: playerId, turnSecondsLeft: Math.ceil(ms / 1000), turnTotalSeconds: Math.ceil(ms / 1000) }),
  tickTurn: () => set((s) => ({ turnSecondsLeft: Math.max(0, s.turnSecondsLeft - 1) })),
  clearTurn: () => set({ turnPlayerId: null, turnSecondsLeft: 0 }),
  setLastBetEvent: (lastBetEvent) => set({ lastBetEvent }),
  setGameState: (gameState) => set({ gameState }),
  setMyCards: (myCards) => set({ myCards }),
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setWinners: (winners) => set({ winners }),
  setHandDescriptions: (handDescriptions) => set({ handDescriptions }),
  setChipUpdates: (chipUpdates) => set({ chipUpdates }),
  setAwaitingNextRound: (awaitingNextRound) => set({ awaitingNextRound }),
  reset: () => set({ gameState: null, myCards: [], isMyTurn: false, winners: [], handDescriptions: {}, chipUpdates: {}, awaitingNextRound: false, turnPlayerId: null, turnSecondsLeft: 0, lastBetEvent: null, waitingPlayers: [] }),
}));
