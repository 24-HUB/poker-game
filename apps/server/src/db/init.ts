/**
 * Idempotent database initializer.
 * Runs "CREATE TABLE IF NOT EXISTS" + "ADD COLUMN IF NOT EXISTS" on every startup
 * so the DB is always up-to-date without needing a separate migration step.
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

export async function initDb(): Promise<void> {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const isRemote = DATABASE_URL.includes('supabase.co') ||
    DATABASE_URL.includes('sslmode=require');

  const sql = postgres(DATABASE_URL, { max: 1, ssl: isRemote ? 'require' : false });

  try {
    // Enums — safe to call multiple times
    await sql`
      DO $$ BEGIN
        CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `;
    await sql`
      DO $$ BEGIN
        CREATE TYPE item_type AS ENUM ('card_skin', 'avatar', 'table_theme');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `;
    await sql`
      DO $$ BEGIN
        CREATE TYPE item_rarity AS ENUM ('R', 'SR', 'SSR');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `;

    // users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username        VARCHAR(50)  UNIQUE NOT NULL,
        email           VARCHAR(255) UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        avatar_url      TEXT,
        chips           INTEGER NOT NULL DEFAULT 1000,
        pity_count_sr   INTEGER NOT NULL DEFAULT 0,
        pity_count_ssr  INTEGER NOT NULL DEFAULT 0,
        wins            INTEGER NOT NULL DEFAULT 0,
        hands_played    INTEGER NOT NULL DEFAULT 0,
        last_daily_reward TEXT,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    // Add columns that may not exist in older DB instances
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS hands_played INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_reward TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pity_count_sr INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pity_count_ssr INTEGER NOT NULL DEFAULT 0`;

    // sessions (simple token ↔ userId store)
    await sql`
      CREATE TABLE IF NOT EXISTS session (
        id          TEXT PRIMARY KEY,
        expires_at  TIMESTAMP NOT NULL,
        token       TEXT UNIQUE NOT NULL,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address  TEXT,
        user_agent  TEXT,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // lobby rooms
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL,
        host_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        max_players INTEGER NOT NULL DEFAULT 6,
        min_bet     INTEGER NOT NULL DEFAULT 10,
        status      room_status NOT NULL DEFAULT 'waiting',
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // gacha items catalogue (static, text PK like 'r001')
    await sql`
      CREATE TABLE IF NOT EXISTS gacha_items (
        id          TEXT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        type        item_type NOT NULL,
        rarity      item_rarity NOT NULL,
        image_url   TEXT NOT NULL,
        description TEXT NOT NULL
      )
    `;

    // user collection
    await sql`
      CREATE TABLE IF NOT EXISTS user_collection (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id     TEXT NOT NULL REFERENCES gacha_items(id) ON DELETE CASCADE,
        obtained_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_equipped BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(user_id, item_id)
      )
    `;

    // game history (roomId is plain text — no FK so test rooms work too)
    await sql`
      CREATE TABLE IF NOT EXISTS game_history (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id          TEXT NOT NULL,
        round_number     INTEGER NOT NULL DEFAULT 1,
        pot              INTEGER NOT NULL,
        winners          JSONB NOT NULL DEFAULT '[]',
        player_summary   JSONB NOT NULL DEFAULT '[]',
        hand_descriptions JSONB NOT NULL DEFAULT '{}',
        played_at        TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    // Migrate old game_history schema if it had different columns
    await sql`ALTER TABLE game_history ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1`;
    await sql`ALTER TABLE game_history ADD COLUMN IF NOT EXISTS winners JSONB NOT NULL DEFAULT '[]'`;
    await sql`ALTER TABLE game_history ADD COLUMN IF NOT EXISTS player_summary JSONB NOT NULL DEFAULT '[]'`;
    await sql`ALTER TABLE game_history ADD COLUMN IF NOT EXISTS hand_descriptions JSONB NOT NULL DEFAULT '{}'`;

    console.log('✅ Database schema ready');
  } finally {
    await sql.end();
  }
}
