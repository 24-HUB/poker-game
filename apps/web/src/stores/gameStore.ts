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
  setGameState: (gameState) => set({ gameState }),
  setMyCards: (myCards) => set({ myCards }),
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setWinners: (winners) => set({ winners }),
  setHandDescriptions: (handDescriptions) => set({ handDescriptions }),
  setChipUpdates: (chipUpdates) => set({ chipUpdates }),
  setAwaitingNextRound: (awaitingNextRound) => set({ awaitingNextRound }),
  reset: () => set({ gameState: null, myCards: [], isMyTurn: false, winners: [], handDescriptions: {}, chipUpdates: {}, awaitingNextRound: false }),
}));
