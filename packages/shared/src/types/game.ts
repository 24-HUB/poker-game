/** packages/shared/src/types/game.ts */

/**
 * Represents the four suits in a standard deck of cards.
 */
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/**
 * Represents the numerical or face value of a card.
 */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';

/**
 * Represents a single playing card with a suit and a rank.
 */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/**
 * Defines the possible statuses of a player during a game session.
 */
export type PlayerStatus = 'active' | 'folded' | 'all_in' | 'sitting_out';

/**
 * Defines the sequential phases of a Texas Hold'em poker game.
 */
export type GamePhase = 'waiting' | 'pre_flop' | 'flop' | 'turn' | 'river' | 'showdown';

/**
 * Represents the comprehensive state of an individual player.
 */
export interface PlayerState {
  /** Unique identifier for the player */
  id: string;
  /** Display name of the player */
  username: string;
  /** Current total chips available to the player */
  chips: number;
  /** Current amount bet by the player in the current round */
  bet: number;
  /** Cards currently held by the player (hidden from others usually) */
  cards: Card[];
  /** Current status of the player in the hand */
  status: PlayerStatus;
  /** Whether the player is currently the dealer */
  isDealer: boolean;
  /** Whether it is currently this player's turn to act */
  isTurn: boolean;
  /** Whether the player has taken an action in the current betting round */
  hasActed: boolean;
  /** Total chips contributed to the pot across all rounds in the current hand */
  totalContributed: number;
}

/**
 * Represents the complete state of a poker game at any given time.
 */
export interface GameState {
  /** Current phase of the game */
  phase: GamePhase;
  /** List of all players in the game and their states */
  players: PlayerState[];
  /** Cards dealt to the middle of the table shared by all players */
  communityCards: Card[];
  /** Total amount of chips currently in the pot */
  pot: number;
  /** The minimum amount required to call in the current round */
  currentBet: number;
  /** The ID of the player whose turn it currently is */
  activePlayerId: string | null;
  /** The index of the dealer in the players array */
  dealerIndex: number;
  /** The amount for the small blind */
  smallBlind: number;
  /** The amount for the big blind */
  bigBlind: number;
  /** The current betting round number */
  round: number;
}
