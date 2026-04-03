import { create } from 'zustand';
import { GameState, Card } from '../../../packages/shared/src/types/game';

interface GameStore {
  gameState: GameState | null;
  myCards: Card[];
  isMyTurn: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  winners: { playerId: string; amount: number }[];
  handDescriptions: Record<string, string>;
  setGameState: (state: GameState | null) => void;
  setMyCards: (cards: Card[]) => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  setWinners: (winners: { playerId: string; amount: number }[]) => void;
  setHandDescriptions: (handDescriptions: Record<string, string>) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  myCards: [],
  isMyTurn: false,
  connectionStatus: 'disconnected',
  winners: [],
  handDescriptions: {},
  setGameState: (gameState) => set({ gameState }),
  setMyCards: (myCards) => set({ myCards }),
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setWinners: (winners) => set({ winners }),
  setHandDescriptions: (handDescriptions) => set({ handDescriptions }),
  reset: () => set({ gameState: null, myCards: [], isMyTurn: false, winners: [], handDescriptions: {} }),
}));
