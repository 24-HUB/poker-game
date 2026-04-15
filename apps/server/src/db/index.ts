import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Parse URL components individually to avoid URL parsing issues with
// special characters (e.g. $ in password) across different postgres.js versions
const dbUrl = new URL(process.env.DATABASE_URL);
const isRemote = dbUrl.hostname.includes('supabase.co') ||
  process.env.DATABASE_URL.includes('sslmode=require');

const client = postgres({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  username: dbUrl.username,
  password: dbUrl.password,
  ssl: isRemote ? 'require' : false,
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });

export default db;
