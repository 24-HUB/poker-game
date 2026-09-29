import type { RoomMutationCommand, RoomReply, RoomView, ServerToClientEvents } from '@poker/contracts';
import { createStore } from 'zustand/vanilla';

export type RoomState = {
  accountId: string | null;
  room: RoomView | null;
  invitation: NonNullable<RoomReply['invitation']> | null;
  pendingCommand: RoomMutationCommand | null;
  interruption: string | null;
  setAccount: (accountId: string | null) => void;
  applySnapshot: (view: RoomView) => void;
  setInvitation: (invitation: NonNullable<RoomReply['invitation']> | null) => void;
  setPendingCommand: (command: RoomMutationCommand | null) => void;
  close: (reason: Parameters<ServerToClientEvents['room:closed']>[0]['reason']) => void;
  clearInterruption: () => void;
  clear: () => void;
};

export function createRoomStore() {
  return createStore<RoomState>((set) => ({
    accountId: null,
    room: null,
    invitation: null,
    pendingCommand: null,
    interruption: null,
    setAccount: (accountId) => set((state) => state.accountId === accountId
      ? state
      : { accountId, room: null, invitation: null, pendingCommand: null, interruption: null }),
    applySnapshot: (view) => set((state) => {
      if (state.room?.roomId === view.roomId && state.room.revision >= view.revision) return state;
      return { room: view, interruption: null };
    }),
    setInvitation: (invitation) => set({ invitation }),
    setPendingCommand: (pendingCommand) => set({ pendingCommand }),
    close: (reason) => set({
      room: null,
      invitation: null,
      pendingCommand: null,
      interruption: reason === 'RESTARTED'
        ? 'The game server restarted, so the previous room was closed.'
        : null,
    }),
    clearInterruption: () => set({ interruption: null }),
    clear: () => set({ room: null, invitation: null, pendingCommand: null, interruption: null }),
  }));
}

export const roomStore = createRoomStore();
