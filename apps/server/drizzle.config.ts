import { defineConfig } from 'drizzle-kit';

const rawUrl = process.env.DATABASE_URL ?? 'postgres://postgres:password@localhost:5432/poker_db';
const u = new URL(rawUrl);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    // Use parsed components so special characters in the password (e.g. $) are handled correctly
    host: u.hostname,
    port: Number(u.port) || 5432,
    database: u.pathname.slice(1),
    user: u.username,
    password: u.password,
    ssl: u.hostname.includes('supabase.co'),
  },
});
