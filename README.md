# Poker Anime Gacha

**Looking Glass Club** is a private Texas Hold'em game for two to six friends,
with persistent tickets and an anime-inspired cosmetic collection.
Poker chips last for one group session. Tickets persist between sessions, and
cosmetics never affect poker strength. There are no real-money purchases or
chip-to-ticket conversions.

## Current status

The `dev` branch includes the locally verified foundation, private rooms, poker,
tickets, and collection milestones (M0-M4):

- Invite-only accounts with email verification and password recovery.
- Private room invitations, seats, host controls, and explicit device takeover.
- Server-authoritative no-limit Texas Hold'em, consecutive hands, turn timers,
  private cards, reconnect recovery, and session results.
- Persistent ticket wallets and atomic hand rewards: one participation ticket
  plus one for positive net chips, with a manual-action requirement and a
  20-ticket limit per UTC day.
- Twelve original celestial avatars/card backs, atomic ticket-funded pulls,
  persistent ownership, and equipment applied at the next hand.

Collection, pulls, and equipment (M4) were merged in
[PR #13](https://github.com/24-HUB/poker-game/pull/13) on 2026-10-02.
Pulls cost 5 tickets each or 50 for ten, with R/SR/SSR odds of 70/25/5%,
SR+ guaranteed by pull 10 and SSR by pull 90. Unowned SSRs are selected first;
duplicates give no refund. Hosted friends playtesting (M5) and live email delivery
verification remain pending. Local verification is not deployed acceptance.
See [CHECKPOINT.md](CHECKPOINT.md) for the detailed evidence and handoff history.

## Stack and repository layout

The pnpm workspace uses TypeScript, Next.js App Router and React for the
frontend, NestJS with Express and Socket.IO for the backend, and MongoDB through
the official driver. MongoDB replica-set transactions protect committed game
settlements, ticket rewards, and paid pulls.

| Path | Purpose |
| --- | --- |
| `apps/web` | Responsive frontend and Cloudflare Worker API/WebSocket proxy |
| `apps/server` | Accounts, room authority, poker, tickets, pulls, and collection |
| `packages/contracts` | Shared Zod schemas and transport contracts |
| `packages/poker-engine` | Pure poker rules with explicit clocks and randomness |
| `scripts` | Replica-set initialization and deployment smoke checks |
| `docs` | Deployment preparation, milestone plans, and design references |
| `prototype` | Historical interface prototype, outside the application runtime |

The backend owns game state and validates every command. Socket notifications
prompt clients to recover authoritative views; each player receives only the
private cards they are allowed to see. A backend restart aborts interrupted
sessions while preserving committed tickets and cosmetics.

## Local setup

Prerequisites: Node.js **22.16.0** (the supported range is `>=22.16.0 <23`),
pnpm **10.33.0**, Git, and Docker with Compose. Start Docker before starting the
database services. Run commands from the repository root.

```sh
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
docker compose up -d mongodb mongodb-standalone
pnpm db:init
```

Compose provides a replica set on `127.0.0.1:27018` and a standalone MongoDB on
`127.0.0.1:27019` for transaction-rejection tests. Both use disposable `tmpfs`
storage: stopping or recreating the containers loses their data. Use them for
local development and tests, not persistent playtest storage.

For migrations and verification, set the database variables in the current
shell. This example uses PowerShell:

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true'
$env:MONGODB_DATABASE = 'poker_local'
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true'
pnpm db:migrate
pnpm db:migrate
```

The second migration run checks that applying migrations again is safe. Keep
test database connections separate from any playtest or production database.

## Run and verify locally

For a frontend preview at `http://localhost:3000`:

```sh
pnpm --filter @poker/contracts --filter @poker/poker-engine build
pnpm --filter @poker/web dev
```

`next dev` serves the frontend alone. The application also needs a backend and
a same-origin proxy for `/api/*` and `/socket.io/*`; Next.js has no development
proxy configured. The existing browser-test harness provides that complete
local stack:

```sh
pnpm --filter @poker/web exec node scripts/e2e-stack.mjs
```

It builds and starts the backend, applies migrations and publishes the catalogue
to a generated isolated database, and serves the combined app at
`http://127.0.0.1:3100`. The harness uses test-only email capture and restart
endpoints on loopback. It is intended
for development verification, not hosting. Stop it before running Playwright
so the suite starts its own fresh stack.

Run the workspace checks and browser flows:

```sh
pnpm check
pnpm --filter @poker/web exec playwright install chromium
pnpm --filter @poker/web test:e2e
```

`pnpm check` runs workspace typechecks, unit and integration tests, script tests,
and production builds. It requires both disposable MongoDB services. Playwright
starts its own backend, frontend, proxy, and isolated database; it covers account
recovery, room and poker flows, ticket wallets, pulls, and equipment. There is
no lint script.

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Build shared packages and check workspace types |
| `pnpm test` | Script tests and workspace unit/integration tests |
| `pnpm build` | Production builds for the workspace |
| `pnpm --filter @poker/server start:dev` | Watch the backend with environment variables supplied |
| `pnpm --filter @poker/server catalogue:publish` | Publish the immutable catalogue to an explicitly configured database |
| `pnpm --filter @poker/web build:worker` | Package the frontend and Cloudflare Worker proxy |

Worker packaging on Windows requires symlink privileges; Linux CI runs this
check. CI also runs frozen installation, replica-set initialization, migration
idempotency, and `pnpm check`. Browser tests are a separate local check.

## Application configuration

[.env.example](.env.example) lists the configuration placeholders. For a
configured backend, copy it to the ignored root `.env` and replace the values:

```powershell
Copy-Item .env.example .env
```

The server reads process environment variables; copying the file does not
automatically load it. After building, Node can load it explicitly:

```sh
pnpm build
node --env-file=.env apps/server/dist/main.js
```

| Variable | Used for |
| --- | --- |
| `PORT`, `NODE_ENV` | Backend port and runtime mode |
| `PUBLIC_ORIGIN` | Browser origin, authentication callbacks, and origin validation |
| `BACKEND_ORIGIN` | Worker proxy's fixed backend destination |
| `PROXY_SECRET` | Shared server/Worker secret for trusted proxy requests |
| `MONGODB_URI`, `MONGODB_DATABASE` | Backend persistence and migrations |
| `TEST_MONGODB_URI` | Isolated replica-set integration tests |
| `BETTER_AUTH_SECRET` | Authentication secret of at least 32 characters |
| `REGISTRATION_INVITE_CODE_SHA256` | SHA-256 hex digest of the private registration code |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Server-only verification and password-reset email delivery |

Real signup and recovery require a configured Brevo sender and API key. The
browser harness supplies its own test configuration without sending live mail.

Outside the harness, pulls require explicit catalogue publication after
migrations, with both `MONGODB_URI` and `MONGODB_DATABASE` set in the process
environment. Build the shared packages before running `catalogue:publish`.
See [deployment preparation](docs/deployment.md) for the procedure; live
catalogue publication requires separate authorization.

Keep database credentials, authentication secrets, and proxy/email secrets
server-side; never expose them through `NEXT_PUBLIC_` variables or commit `.env`.

## Deployment and contributing

The hosting target is Cloudflare Workers for the frontend/proxy, one Render
backend, and MongoDB Atlas. The Worker routes API and WebSocket traffic to the
backend using HTTPS origins and the shared proxy secret. Provider setup,
deployment, and production database operations require separate authorization.
Follow [docs/deployment.md](docs/deployment.md) for preparation and acceptance
checks.

Changes use a task branch from freshly fetched `origin/dev` and a pull request
targeting `dev`. The repository owner merges manually. Read
[AGENTS.md](AGENTS.md) before making changes.

- [plan.md](plan.md): product scope, architecture, decisions, and milestones.
- [CHECKPOINT.md](CHECKPOINT.md): implementation evidence and resume instructions.
- [Remaining milestone plan](docs/superpowers/plans/2026-09-30-m3-through-production.md): M3-M5 and proposed production phases.
- [design.md](design.md): interface design direction.
- [M4 implementation](docs/m4-implementation.md): collection policy and verification.
