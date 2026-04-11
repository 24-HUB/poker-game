/** packages/shared/src/types/socket.ts */

import { Card, GameState, PlayerState } from './game';

/**
 * Defines the possible actions a player can take during their turn.
 */
export interface GameAction {
  /** The type of action performed */
  type: 'fold' | 'call' | 'check' | 'raise';
  /** The amount associated with the action (relevant for raise) */
  amount: number;
}

/**
 * Events sent from the client to the server.
 */
export interface ClientToServerEvents {
  /** Join a specific game room */
  'room:join': (roomId: string) => void;
  /** Leave the current game room */
  'room:leave': () => void;
  /** Signal that the player is ready to start */
  'room:ready': () => void;
  /** Perform a game action (fold, call, etc.) */
  'game:action': (action: GameAction) => void;
  /** Send a chat message to the room */
  'game:chat': (message: string) => void;
}

/**
 * Events sent from the server to the client.
 */
export interface ServerToClientEvents {
  /** Fired when the room state changes (e.g., player list) */
  'room:updated': (players: PlayerState[]) => void;
  /** Fired when a new player joins the room */
  'room:playerJoined': (player: PlayerState) => void;
  /** Fired when a player leaves the room */
  'room:playerLeft': (playerId: string) => void;
  /** Fired when the game successfully starts */
  'game:started': () => void;
  /** Fired whenever the global game state is updated */
  'game:stateUpdate': (state: GameState) => void;
  /** Fired to send private cards to a specific player */
  'game:yourCards': (cards: Card[]) => void;
  /** Fired when community cards are dealt (flop, turn, river) */
  'game:newStreet': (cards: Card[]) => void;
  /** Fired when the hand ends and winners are determined */
  'game:ended': (payload: { winners: { playerId: string; amount: number }[]; handDescriptions: Record<string, string>; chipUpdates: Record<string, number> }) => void;
  /** Fired to notify a specific player it is their turn */
  'game:playerTurn': (playerId: string, timeoutMs: number) => void;
  /** Fired when a chat message is received from any player */
  'game:chatMessage': (playerId: string, username: string, message: string) => void;
}
