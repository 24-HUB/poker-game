import type { GameView } from '@poker/contracts';
import { describe, expect, it } from 'vitest';

import { createGameStore } from './gameStore';

const view = (revision: number, sessionId = 'session-a', roomId = 'room-a'): GameView => ({
  roomId, authorityBootId: 'boot-a', sessionId, handId: 'hand-a', snapshotRevision: revision,
  gameVersion: revision, sessionPhase: 'playing', handPhase: 'preflop', participants: [],
  board: [], pots: [], buttonSeat: 0, actorAccountId: 'account-a', serverTime: new Date().toISOString(),
  deadline: null, holeCards: [0, 1], revealedCards: [], legalActions: {
    canFold: true, canCheck: false, callAmount: 10, raise: null,
  }, control: { isController: true, epoch: 1 }, handResult: null, sessionResult: null,
});

describe('gameStore', () => {
  it('rejects older revisions and previous session or room snapshots', () => {
    const store = createGameStore();
    store.getState().setBoundary('account-a', 'room-a', 'session-a', 'boot-a');
    store.getState().applySnapshot(view(4));
    store.getState().applySnapshot(view(3));
    expect(store.getState().game?.snapshotRevision).toBe(4);
    store.getState().setBoundary('account-a', 'room-a', 'session-b', 'boot-a');
    expect(store.getState().game).toBeNull();
    store.getState().applySnapshot(view(9));
    expect(store.getState().game).toBeNull();
    store.getState().applySnapshot(view(1, 'session-b'));
    expect(store.getState().game?.snapshotRevision).toBe(1);
    store.getState().setBoundary('account-a', 'room-b', 'session-c', 'boot-a');
    store.getState().applySnapshot(view(10, 'session-b'));
    expect(store.getState().game).toBeNull();
  });

  it('clears private cards when the account or authority changes', () => {
    const store = createGameStore();
    store.getState().setBoundary('account-a', 'room-a', 'session-a', 'boot-a');
    store.getState().applySnapshot(view(1));
    store.getState().setBoundary('account-b', 'room-a', 'session-a', 'boot-a');
    expect(store.getState().game).toBeNull();
    store.getState().applySnapshot(view(2));
    store.getState().setBoundary('account-b', 'room-a', 'session-a', 'boot-b');
    expect(store.getState().game).toBeNull();
  });
});
