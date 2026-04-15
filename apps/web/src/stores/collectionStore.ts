import { create } from 'zustand';
import type { GachaItem } from '../lib/api';

interface CollectionStore {
  items: GachaItem[];
  lastPullResults: GachaItem[];
  pityCountSR: number;
  pityCountSSR: number;
  equippedCardSkinId: string | null;
  dailyReward: { chips: number } | null;
  setItems: (items: GachaItem[]) => void;
  addItems: (newItems: GachaItem[]) => void;
  setLastPullResults: (results: GachaItem[]) => void;
  setPityCountSR: (count: number) => void;
  setPityCountSSR: (count: number) => void;
  setEquippedCardSkinId: (id: string | null) => void;
  setDailyReward: (reward: { chips: number } | null) => void;
  clearLastPullResults: () => void;
}

export const useCollectionStore = create<CollectionStore>((set) => ({
  items: [],
  lastPullResults: [],
  pityCountSR: 0,
  pityCountSSR: 0,
  equippedCardSkinId: null,
  dailyReward: null,
  setItems: (items) => set({ items }),
  addItems: (newItems) =>
    set((state) => {
      const existingIds = new Set(state.items.map((i) => i.id));
      const unique = newItems.filter((i) => !existingIds.has(i.id));
      return { items: [...state.items, ...unique] };
    }),
  setLastPullResults: (lastPullResults) => set({ lastPullResults }),
  setPityCountSR: (pityCountSR) => set({ pityCountSR }),
  setPityCountSSR: (pityCountSSR) => set({ pityCountSSR }),
  setEquippedCardSkinId: (equippedCardSkinId) => set({ equippedCardSkinId }),
  setDailyReward: (dailyReward) => set({ dailyReward }),
  clearLastPullResults: () => set({ lastPullResults: [] }),
}));
