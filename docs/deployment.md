# M0/M1 deployment preparation

For the complete remaining release sequence, see the
[M3 through production plan](superpowers/plans/2026-09-30-m3-through-production.md),
especially M5 hosted acceptance, M6 authorized production cutover, and M7
operations. The steps below remain the original preparation baseline, not
evidence of a live deployment. The actual frontend adapter is OpenNext.

Deployment is intentionally manual. This repository prepares configuration and smoke checks but does not authorize creating provider resources, applying migrations to a live database, uploading secrets, or deploying either service.

## Provider layout

- Cloudflare Workers serves the Next.js application and proxies only `/api/*` and `/socket.io/*` to the fixed Render backend.
- Render runs the NestJS server from `render.yaml`. Automatic deploys are disabled and `/health/deploy` is the deployment health check.
- MongoDB Atlas supplies a replica-set connection. Do not use the local Docker database or a standalone server for deployment.

## Required configuration

Configure these values in provider dashboards; never commit their live values.

| Provider | Name | Purpose |
| --- | --- | --- |
| Cloudflare | `BACKEND_ORIGIN` | Exact HTTPS Render backend origin |
| Cloudflare | `PUBLIC_ORIGIN` | Exact HTTPS public Worker origin |
| Cloudflare secret | `PROXY_SECRET` | Shared random proxy credential, identical to Render |
| Render | `PUBLIC_ORIGIN` | Exact HTTPS public Worker origin |
| Render | `PROXY_SECRET` | Shared random proxy credential, identical to Cloudflare |
| Render | `MONGODB_URI` | Atlas replica-set URI |
| Render | `MONGODB_DATABASE` | Dedicated playtest database name |
| Render | `BETTER_AUTH_SECRET` | At least 32 random characters |
| Render | `REGISTRATION_INVITE_CODE_SHA256` | Lowercase SHA-256 hex digest of the temporary registration code |
| Render | `ALLOW_NEW_SESSIONS` | Server-only `true`/`false`: permit new poker sessions; blueprint starts closed |
| Render | `ECONOMY_WRITES_ENABLED` | Server-only `true`/`false`: permit new pulls/equipment changes; blueprint starts closed |
| Render secret | `BREVO_API_KEY` | Transactional email API credential |
| Render | `BREVO_SENDER_EMAIL` | Sender address controlled and verified by the release operator |
| Render | `BREVO_SENDER_NAME` | Sender display name; defaults to Looking Glass Club |

Wrangler keeps dashboard-defined variables during builds. The repository contains no deploy workflow and no Cloudflare or Render credentials. When deployment is separately authorized, scope provider tokens to the single service and run migrations as a controlled step before the manual Render deploy; the free Render plan does not provide a pre-deploy migration step.

## Session admission and maintenance

Both controls accept exactly lowercase `true` or `false`. Invalid values stop
startup without printing the submitted value. Settings are captured once per
process; changing provider configuration requires a controlled backend restart.
When absent, they default to closed in production and open outside production.
The local example explicitly opens both; the Render blueprint explicitly closes
both until an operator authorizes release. No browser parameter or HTTP/socket
endpoint can change them.

`ALLOW_NEW_SESSIONS=false` returns `MAINTENANCE` for a new start, while an identical
already committed start can resolve its original identity. Open admission still
allows only one active session room globally. Starts, completion and abort share
the MongoDB authority fence, so concurrent rooms cannot independently reserve
capacity. Capacity remains occupied until durable completion or abort, including
the hand-result interval and pending host-end requests.

`ECONOMY_WRITES_ENABLED=false` returns HTTP 503 with `MAINTENANCE` for a new pull
or equipment change. Receipt, catalogue, inventory and equipment reads remain
available. A committed purchase retry returns its original result before the
maintenance gate, even if the catalogue is unavailable; changed payloads under
the same request ID still conflict. Blocked purchases do not initialize wallets,
debit tickets, change pity or create inventory. Work admitted by an open process
can finish or resolve an uncertain commit; flags do not cancel transactions.

The controls do not pause existing hand actions, next-hand advancement or earned
reward settlement. To close an operating environment, have the host end the
session and wait for settlement, then restart with both controls false. If a
restart interrupts a session, ownership startup cleanup explicitly aborts its
unfinished hands; committed rewards and purchases survive. Reopening requires
an authorized restart with both controls true and the normal release checks.
There is no live settings API or automatic provider change in this implementation.

These controls are not a database write freeze. Authentication/session refresh,
lazy wallet reads, lease renewal and admitted settlements can still write. For
a consistent backup or an uncertain ledger incident, stop and confirm all writer
processes and jobs as described in [operations.md](operations.md).

## M3 account recovery and tickets

Production requires verified email before account, room or wallet access. Existing
unverified accounts use **Resend verification** with their original email; verification
retains their account ID and balance. Wallets start at zero, with no historical reward
backfill. Reset links expire after one hour, can be consumed once, and revoke older
sessions. Browser wallet reads recover missed hints on reconnect, focus and UTC midnight.

Password reset wraps the pinned provider's reset endpoint in its MongoDB transaction
context. Token consumption, password update and previous-session deletion commit
together. An interruption rolls them all back, leaving the same unexpired link
usable for a retry. The wrapper uses the provider's token checks and password hashing;
it does not implement another token format or require additional configuration.

Brevo setup and real verification/reset delivery remain pending separate authorization.
Before rewards ship, prove delivery to the intended friends, including provider outage
and retry behavior, using the approved sender. Tests use fake delivery only. Never set
`ACCOUNT_EMAIL_TRANSPORT=memory`, `ACCOUNT_EMAIL_TEST_IPC` or `ACCOUNT_RECOVERY_ENFORCED`
in a deployed environment; these are test fixtures and production always enforces recovery.

The Worker replaces incoming `x-poker-client-ip` with Cloudflare's visitor address;
Better Auth uses that header for recovery limits only after the proxy-secret guard.
Keep visitor IP headers enabled and verify separate clients have separate limits in
hosted acceptance. Cloudflare documents this address in its
[HTTP header reference](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip).
Clients sharing an IP still share provider rate limits. Do not trust a caller's
`x-forwarded-for` or expose the backend without its proxy guard.

## M4 catalogue preparation

Migration 005 adds collection, equipment, banner-progress and pull-receipt storage.
The server never publishes catalogue data automatically at startup. After migrations,
an operator publishes `celestial-v1` explicitly with:

```powershell
pnpm --filter @poker/server catalogue:publish
```

Both `MONGODB_URI` and `MONGODB_DATABASE` must be explicitly set for this command.
It inserts the approved immutable version, accepts an identical replay and rejects
changed content under the same version. The browser acceptance harness supplies
its disposable database and publishes there. No playtest or production catalogue
has been published; running this command against a live database requires separate
authorization. An unpublished catalogue returns an actionable unavailable state.

## Local acceptance

`pnpm build:server` builds the contracts, poker engine and Nest server in workspace
dependency order. Render uses that same command after a frozen installation. CI runs
it immediately after checkout/install, before any typecheck or other build can supply
cached `dist` output. A contracts-only build is insufficient for the server.

Linux CI retains migration idempotency, aggregate checks and OpenNext Worker packaging,
then installs Chromium with its system dependencies and runs the full browser suite.
The browser harness creates a unique disposable local database, applies migrations and
publishes the approved test catalogue; it does not connect to Atlas or send real email.
Tests run with one worker and no retries, and focused `.only` tests fail CI.

CI disables browser traces, automatic screenshots and video, and does not upload test
reports or manually captured media. Local failure traces and screenshots can contain
cookies, invitation fragments or private cards: keep them in ignored `test-results/`
and review/redact them before sharing. Test output in the CI job supplies the result;
do not publish raw captures as release evidence. This follows the browser setup in
[Playwright's CI guide](https://playwright.dev/docs/ci).

See the [release checklist](release-checklist.md) for the remaining M5 gates. CI success
alone does not establish hosted acceptance, live email delivery or restore readiness.

M5.2 local recovery preparation is in [operations.md](operations.md): approved
operator/retention/recovery targets, read-only economy audit, complete writer
quiescence, encrypted backup, isolated namespace restore and incident response.
`pnpm test:economy` verifies valid/corrupt local fixtures; `pnpm test:backup` creates
an independent authenticated disposable replica set and checks metadata, sign-in
and committed progression after restore. CI runs both without external credentials.
The encrypted live storage location remains pending. M5.1 admission/maintenance
controls are locally verified; expanded visual/gameplay acceptance, hosted restore,
provider/email acceptance and deployment remain separate gates.

```powershell
docker compose up -d mongodb mongodb-standalone
pnpm db:init
pnpm db:migrate
pnpm db:migrate
pnpm check
pnpm --filter @poker/web exec playwright test
```

The OpenNext Worker bundle is verified in Linux CI because Windows requires symlink privileges during packaging.

## Authorized deployment smoke

After both providers and Atlas are configured by an authorized operator:

```powershell
$env:PUBLIC_ORIGIN = 'https://play.example.com'
pnpm smoke:deployment
```

The smoke command prints only shell/readiness status. It does not print the origin, cookies, credentials, response bodies, or environment secrets. A sleeping, unreachable, standby, or malformed deployment exits nonzero with a bounded generic error.

Deployed M0/M1 acceptance: **not run—deployment not authorized**.
