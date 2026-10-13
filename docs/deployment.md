# M0/M1 deployment preparation

For the complete remaining release sequence, see the
[M3 through production plan](superpowers/plans/2026-09-30-m3-through-production.md),
especially M5 hosted acceptance, M6 authorized production cutover, and M7
operations. The steps below remain the original preparation baseline, not
evidence of a live deployment. The actual frontend adapter is OpenNext.

The user requested automatic Render deployments on 2026-10-12. After this
configuration is manually merged into `dev` and synced by the existing Render
Blueprint, Render deploys that branch after its GitHub CI checks pass. PR merges
remain manual. This change does not provision services, upload secrets or apply
live database migrations; Cloudflare deployment behavior is configured separately.

## Provider layout

- Cloudflare Workers serves the Next.js application and proxies only `/api/*` and `/socket.io/*` to the fixed Render backend.
- Render runs the NestJS server from `render.yaml`. `autoDeployTrigger: checksPass`
  waits for the linked `dev` commit's CI checks; `/health/deploy` remains its
  deployment health check. The existing GitHub Actions workflow runs on pushes
  to `dev`, so no deploy hook, Render API key or additional workflow is needed.
- Render Free rejects an explicit `maxShutdownDelaySeconds` setting, including
  `30`. Omit it and use the provider's default shutdown period. If Blueprint
  creation reports this error, load the corrected `dev` revision after manual
  PR merge and retry validation before provisioning.
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

Wrangler keeps dashboard-defined variables during builds. The repository contains
no provider-deploy workflow and no Cloudflare or Render credentials. Render's
native CI integration reads the existing workflow results. In the Render service
settings, confirm the linked branch is `dev` and Auto-Deploy says **After CI Checks
Pass** after Blueprint sync. Render treats successful, neutral and skipped GitHub
checks as passing; zero detected checks or a failed check blocks automatic deploys.
See [Render's CI integration](https://render.com/docs/deploys#integrating-with-ci).

Before merging a schema-dependent release, disable Auto-Deploy and pause automatic
Blueprint sync so the merge cannot re-enable deployment while migrations are
pending. Drain active play, take the required backup, apply approved migrations
from an operator context and verify compatibility before resuming deployment.
Render Free has no pre-deploy migration command. Never add live Atlas credentials
to the disposable CI migration step. For an ordinary backend release, finish active
play before merging: replacement can abort an unfinished hand, while committed
progress survives. Cloudflare and Render releases are independent, not an atomic
rollout; coordinate compatible frontend/backend changes explicitly.

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
backfill. Verification and password reset use six-digit email codes that expire
after ten minutes. Successful verification/reset returns to password sign-in;
reset also verifies an unverified email and revokes all previous sessions.
Browser wallet reads recover missed hints on reconnect, focus and UTC midnight.

Dedicated challenges use a domain-separated HMAC derived from the existing
`BETTER_AUTH_SECRET`, while Better Auth 1.7.6 still owns password hashing,
registration and uncached sessions. Challenge consumption, password update,
email verification, both-purpose invalidation and session deletion commit in one
MongoDB transaction. An aborted transaction leaves the valid code recoverable;
wrong-attempt outcomes commit their durable count before returning an error.
Five wrong submissions exhaust a challenge. Resend invalidates the old code;
the database enforces a 60-second cooldown, five address/purpose issuances per
hour, 20 send attempts/IP/hour and 30 confirmations/IP/ten minutes. Eligible and
ineligible requests share the bounded five-second Brevo response window, so an
email timeout does not reveal account existence. Messages never contain recovery
links. Code confirmation never creates a new session.

Migration **006** adds challenge, transient serialization and rate-counter
collections with validators/indexes. It is additive and idempotent and does not
rewrite existing auth, wallet or cosmetic documents. Preserve two challenge
tombstones per account to reject immediately repeated codes; transient locks and
bounded rate counters expire through TTL cleanup. Rotating the auth secret also
invalidates outstanding codes and requires fresh requests.

Before an authorized release, pause automatic Render updates, drain active games,
prepare migration 006 with the operator's explicit live-database authorization,
and coordinate the Worker and backend versions. New frontend code requests fail
against the old backend; old link clients fail against the new backend. Apply the
schema before the backend starts and restore automatic deployment only after the
coordinated release is accepted. No live migration/deployment is performed by this
implementation. Old verification/reset GETs redirect to clean request-code pages
without consuming tokens, sending email or echoing query secrets. Legacy POSTs
and unapproved OTP operations stay unavailable; old token documents can expire
naturally. Rollback must never re-enable link acceptance or resurrect consumed
challenges: prefer a compatible corrective release, or pause recovery with a
clear unavailable state while preserving password sign-in.

Hosted acceptance remains separate: prove actual Brevo code delivery and both POST
flows through the public Worker-to-Nest route, account changes, secure cookies on
subsequent password login, old-session revocation, legacy-link retirement, provider
outage and retry behavior using the approved sender. Local fake-email evidence
does not establish that the reported production link failure is fixed. Never set
`ACCOUNT_EMAIL_TRANSPORT=memory`, `ACCOUNT_EMAIL_TEST_IPC` or `ACCOUNT_RECOVERY_ENFORCED`
in a deployed environment; these are test fixtures and production always enforces recovery.

The Worker replaces incoming `x-poker-client-ip` with Cloudflare's visitor address;
the challenge service and Better Auth use that header only after the proxy-secret guard.
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
