/** packages/shared/src/types/gacha.ts */

/**
 * Defines the rarity levels for gacha items.
 */
export type Rarity = 'R' | 'SR' | 'SSR';

/**
 * Defines the categories of items available in the gacha system.
 */
export type ItemType = 'card_skin' | 'avatar' | 'table_theme';

/**
 * Represents a collectible item obtainable through the gacha system.
 */
export interface GachaItem {
  /** Unique identifier for the item */
  id: string;
  /** Display name of the item */
  name: string;
  /** Category of the item */
  type: ItemType;
  /** Rarity level of the item */
  rarity: Rarity;
  /** URL for the item's visual asset */
  imageUrl: string;
  /** Short text describing the item */
  description: string;
}
