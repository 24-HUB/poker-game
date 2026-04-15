import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const isRemote = databaseUrl.includes('supabase.co') ||
  databaseUrl.includes('sslmode=require');

// Parse URL components individually to avoid URL parsing issues with
// special characters (e.g. $ in password) across different postgres.js versions
const dbUrl = new URL(databaseUrl);
const migrationClient = postgres({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  username: dbUrl.username,
  password: dbUrl.password,
  ssl: isRemote ? 'require' : false,
  max: 1,
});
const db = drizzle(migrationClient);

async function runMigrations() {
  console.log('Running migrations...');
  
  await migrate(db, { migrationsFolder: 'drizzle' });
  
  console.log('Migrations completed successfully');
  await migrationClient.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
