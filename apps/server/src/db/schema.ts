import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  integer, 
  timestamp, 
  boolean, 
  jsonb, 
  pgEnum, 
  uniqueIndex 
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { type InferSelectModel, type InferInsertModel, type SQL } from 'drizzle-orm';

// Enums
export const roomStatusEnum = pgEnum('room_status', ['waiting', 'playing', 'finished']);
export const itemTypeEnum = pgEnum('item_type', ['card_skin', 'avatar', 'table_theme']);
export const itemRarityEnum = pgEnum('item_rarity', ['R', 'SR', 'SSR']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  chips: integer('chips').notNull().default(1000),
  pityCountSR: integer('pity_count_sr').notNull().default(0),
  pityCountSSR: integer('pity_count_ssr').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  handsPlayed: integer('hands_played').notNull().default(0),
  lastDailyReward: text('last_daily_reward'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Better-Auth Tables
export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Rooms Table
export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  hostId: uuid('host_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  maxPlayers: integer('max_players').notNull().default(6),
  minBet: integer('min_bet').notNull().default(10),
  status: roomStatusEnum('status').notNull().default('waiting'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Gacha Items Table — uses text IDs (e.g. 'r001', 'sr001') for static catalogue
export const gachaItems = pgTable('gacha_items', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: itemTypeEnum('type').notNull(),
  rarity: itemRarityEnum('rarity').notNull(),
  imageUrl: text('image_url').notNull(),
  description: text('description').notNull(),
});

// User Collection Table
export const userCollection = pgTable('user_collection', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => gachaItems.id, { onDelete: 'cascade' }),
  obtainedAt: timestamp('obtained_at').notNull().defaultNow(),
  isEquipped: boolean('is_equipped').notNull().default(false),
}, (table) => ({
  userItemUnique: uniqueIndex('user_item_unique').on(table.userId, table.itemId),
}));

// Game History Table — stores completed rounds; roomId is plain text (no FK) for flexibility
export const gameHistory = pgTable('game_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: text('room_id').notNull(),
  roundNumber: integer('round_number').notNull().default(1),
  pot: integer('pot').notNull(),
  winners: jsonb('winners').$type<{ playerId: string; amount: number }[]>().notNull().default([]),
  playerSummary: jsonb('player_summary').$type<{ id: string; username: string; finalChips: number; status: string }[]>().notNull().default([]),
  handDescriptions: jsonb('hand_descriptions').$type<Record<string, string>>().notNull().default({}),
  playedAt: timestamp('played_at').notNull().defaultNow(),
});

// Type Helpers
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Room = InferSelectModel<typeof rooms>;
export type GachaItem = InferSelectModel<typeof gachaItems>;
export type UserCollection = InferSelectModel<typeof userCollection>;
export type GameHistory = InferSelectModel<typeof gameHistory>;

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertRoomSchema = createInsertSchema(rooms);
export const selectRoomSchema = createSelectSchema(rooms);
export const insertGachaItemSchema = createInsertSchema(gachaItems);
export const selectGachaItemSchema = createSelectSchema(gachaItems);
export const insertUserCollectionSchema = createInsertSchema(userCollection);
export const selectUserCollectionSchema = createSelectSchema(userCollection);
export const insertGameHistorySchema = createInsertSchema(gameHistory);
export const selectGameHistorySchema = createSelectSchema(gameHistory);

// Re-export SQL type helper (used in server.js for incremental updates)
export type { SQL };
