import type { RoomMutationCommand, RoomReply, RoomView } from '@poker/contracts';
import { createStore } from 'zustand/vanilla';

export type RoomState = {
  accountId: string | null;
  room: RoomView | null;
  invitation: NonNullable<RoomReply['invitation']> | null;
  pendingCommand: RoomMutationCommand | null;
  setAccount: (accountId: string | null) => void;
  applySnapshot: (view: RoomView) => void;
  setInvitation: (invitation: NonNullable<RoomReply['invitation']> | null) => void;
  setPendingCommand: (command: RoomMutationCommand | null) => void;
  clear: () => void;
};

export function createRoomStore() {
  return createStore<RoomState>((set) => ({
    accountId: null,
    room: null,
    invitation: null,
    pendingCommand: null,
    setAccount: (accountId) => set((state) => state.accountId === accountId
      ? state
      : { accountId, room: null, invitation: null, pendingCommand: null }),
    applySnapshot: (view) => set((state) => {
      if (state.room?.roomId === view.roomId && state.room.revision >= view.revision) return state;
      return { room: view };
    }),
    setInvitation: (invitation) => set({ invitation }),
    setPendingCommand: (pendingCommand) => set({ pendingCommand }),
    clear: () => set({ room: null, invitation: null, pendingCommand: null }),
  }));
}

export const roomStore = createRoomStore();
