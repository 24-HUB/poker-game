# Checkpoint — 2026-04-13

## Current Goal
Migrate the backend from in-memory storage to PostgreSQL + Drizzle, while preserving the frontend work already completed for gacha, leaderboard, profile, history, chat, animations, and collection equip flow.

## What Is Already Saved In The Workspace

### Backend DB migration work
- `apps/server/src/db/schema.ts`
  - Added `wins`, `handsPlayed`, `lastDailyReward` to `users`
  - Changed `gacha_items.id` to text primary key
  - Changed `user_collection.item_id` to text foreign key
  - Reworked `game_history` to store `roomId`, `roundNumber`, `pot`, `winners`, `playerSummary`, `handDescriptions`
- `apps/server/src/db/init.ts`
  - New idempotent DB initializer using raw `postgres`
  - Creates enums and tables with safe `CREATE TABLE IF NOT EXISTS`
  - Adds missing columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `apps/server/drizzle.config.ts`
  - New drizzle-kit config
- `apps/server/src/server.js`
  - Rewritten to use Drizzle-backed auth, rooms, gacha, collection, history, leaderboard, and profile routes
  - Seeds static gacha items on startup
  - Keeps active poker engine state in memory via `gameRooms`
  - Persists stats, chip balances, and history
- `apps/server/gen_server.mjs`
  - Generator used to write the new `src/server.js`

### Frontend work already present
- New pages:
  - `apps/web/src/pages/LeaderboardPage.tsx`
  - `apps/web/src/pages/ProfilePage.tsx`
  - `apps/web/src/pages/GameHistoryPage.tsx`
- New store and helpers:
  - `apps/web/src/stores/collectionStore.ts`
  - `apps/web/src/hooks/useGacha.ts`
  - `apps/web/src/lib/sounds.ts`
- Updated routing and UI:
  - `apps/web/src/App.tsx`
  - `apps/web/src/pages/LobbyPage.tsx`
  - `apps/web/src/pages/GachaPage.tsx`
  - `apps/web/src/pages/CollectionPage.tsx`
  - `apps/web/src/components/game/GameTable.tsx`
  - `apps/web/src/components/game/PlayerSeat.tsx`
  - `apps/web/src/hooks/useAuth.ts`
  - `apps/web/src/hooks/useGame.ts`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/stores/gameStore.ts`

### Shared/game logic changes already present
- `packages/shared/src/game/engine.ts`
  - Raise/all-in behavior updated
- `packages/shared/src/game/__tests__/hand.test.ts`
  - Test fixes/adjustments already in workspace
- `apps/server/src/__tests__/api.integration.test.ts`
  - Error shape assertions updated to `data.error.code`

## Current Status

### Completed
- Database schema updated for persistence features
- Idempotent DB init added
- New Drizzle-backed `apps/server/src/server.js` generated and saved
- Frontend feature work from earlier is still present in the workspace

### Not fully verified yet
- Local backend startup from host machine was **not** verified successfully
- The blocker is PostgreSQL authentication when connecting from Bun on Windows to `localhost:5432`

## Current Blocker
Running:
- `bun src/server.js`

with:
- `DATABASE_URL=postgres://postgres:password@localhost:5432/poker_db`

still fails with:
- `PostgresError: password authentication failed for user "postgres"`

Notes:
- Docker container itself is healthy
- `docker exec poker-db psql -U postgres -d poker_db -c "SELECT 1"` works inside the container
- This suggests the persisted Postgres volume / auth config for host TCP access is mismatched with what Bun `postgres` expects locally
- I also changed the container `pg_hba.conf` host rule from `scram-sha-256` to `md5` and reloaded config, but I did not complete a successful retest after that in a clean state

## Important Temporary Files
- `apps/server/gen_server.mjs`
  - Useful if `src/server.js` needs to be regenerated
- `apps/server/write_server.mjs`
  - Temporary partial writer script, probably safe to delete later
- `apps/server/src/server.js.bak`
  - Incomplete accidental backup, not a reliable restore point

## Recommended Resume Plan
1. Re-test Postgres auth from the host with a minimal Bun script from `apps/server`
2. If host auth still fails, either:
   - recreate the `postgres_data` volume cleanly, or
   - keep testing via Docker Compose where the server connects to `db:5432` instead of `localhost:5432`
3. Once the backend starts cleanly, test these routes:
   - `/health`
   - `/api/auth/register`
   - `/api/auth/login`
   - `/api/rooms`
   - `/api/gacha/banners`
   - `/api/leaderboard`
   - `/api/history`
4. Clean up temporary files:
   - `apps/server/write_server.mjs`
   - `apps/server/src/server.js.bak`
5. Run project checks:
   - `pnpm turbo typecheck`
   - relevant server/web tests

## Suggested Commands To Resume
```powershell
cd d:\Developer\game\project_game\poker-game

docker compose up -d db
cd apps\server
$env:DATABASE_URL = "postgres://postgres:password@localhost:5432/poker_db"
bun src/server.js
```

If localhost auth keeps failing, test through compose instead:
```powershell
cd d:\Developer\game\project_game\poker-game
docker compose up -d --build server
```

## Git / Workspace Note
The current development changes are already present in the working tree. This file is only a resume note; it does not commit anything.
