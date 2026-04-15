/** packages/shared/src/game/constants.ts */

/**
 * Default amount for the small blind.
 */
export const DEFAULT_SMALL_BLIND = 10;

/**
 * Default amount for the big blind.
 */
export const DEFAULT_BIG_BLIND = 20;

/**
 * The initial chip count for every player joining a new game.
 */
export const STARTING_CHIPS = 1000;

/**
 * The time limit in milliseconds for a player to make a move.
 */
export const TURN_TIMEOUT_MS = 30000;

/**
 * Cost in currency for a single gacha pull.
 */
export const GACHA_SINGLE_COST = 150;

/**
 * Cost in currency for a ten-pull gacha (usually discounted).
 */
export const GACHA_TEN_COST = 1350;

/**
 * Number of pulls guaranteed to result in at least an SR item.
 */
export const PITY_SR = 10;

/**
 * Number of pulls guaranteed to result in an SSR item.
 */
export const PITY_SSR = 90;
