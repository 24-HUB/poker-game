import type { GameView } from '@poker/contracts';
import { createStore } from 'zustand/vanilla';

export type GameState = {
  accountId: string | null;
  roomId: string | null;
  sessionId: string | null;
  authorityBootId: string | null;
  game: GameView | null;
  setBoundary: (accountId: string | null, roomId: string | null,
    sessionId: string | null, authorityBootId: string | null) => void;
  applySnapshot: (view: GameView) => void;
  clear: () => void;
};

export function createGameStore() {
  return createStore<GameState>((set) => ({
    accountId: null, roomId: null, sessionId: null, authorityBootId: null, game: null,
    setBoundary: (accountId, roomId, sessionId, authorityBootId) => set((state) =>
      state.accountId === accountId && state.roomId === roomId &&
      state.sessionId === sessionId && state.authorityBootId === authorityBootId
        ? state : { accountId, roomId, sessionId, authorityBootId, game: null }),
    applySnapshot: (view) => set((state) => {
      if (!state.accountId || !state.roomId || !state.sessionId || !state.authorityBootId ||
        view.roomId !== state.roomId || view.sessionId !== state.sessionId ||
        view.authorityBootId !== state.authorityBootId) return state;
      if (state.game && view.snapshotRevision <= state.game.snapshotRevision) return state;
      return { game: view };
    }),
    clear: () => set({ accountId: null, roomId: null, sessionId: null, authorityBootId: null, game: null }),
  }));
}

export const gameStore = createGameStore();
