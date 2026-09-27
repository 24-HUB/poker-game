# Checkpoint — M0/M1 production implementation

Updated: 2026-09-27. Status: Tasks 1–5 complete on `codex/m0-m1-foundation`; Task 6 invite-only email authentication is next.

## User intent and usage rule

The user approved the M0/M1 implementation plan and requested inline execution. Work is limited to local implementation and deployment preparation; no cloud provisioning, live secrets, or production database operations are authorized. Save this checkpoint at every task boundary and whenever either remaining usage window drops below 6%. Latest execution-start reading: five-hour remaining 39%, weekly remaining 91%. Never purchase or consume reset credits automatically.

## Active execution

- Branch: `codex/m0-m1-foundation`, created from fetched `origin/dev` at `01f033d0`.
- Plan: `docs/superpowers/plans/2026-09-26-m0-m1-production.md`.
- Completed tasks: Task 1, bootable workspace and shared contracts; Task 2, approved responsive application shell; Task 3, replica-set persistence, transactions, migrations, validators, and indexes; Task 4, fenced backend authority, startup cleanup, health separation, renewal, takeover, and safe shutdown ordering; Task 5, fixed-upstream Worker proxy and protected Socket.IO transport.
- Current task: Task 5 complete pending its boundary commit and push.
- Next action: commit and push Task 5, then start Task 6 invite-only Better Auth email/password and shared HTTP/Socket.IO session resolution with registration-code rejection in RED.
- Verification: `pnpm install --frozen-lockfile` passed. Fresh `pnpm check` passed all workspace typechecks, 34 tests (23 server, 10 web, 1 contracts), and Nest/contract/Next production builds. Worker proxy tests pass 9/9; backend proxy/upgrade tests pass 4/4; Task 4 authority remains 8/8 green. `git diff --check` is the final pre-commit action.
- Deferred environment check: `pnpm --filter @poker/web build:worker` completed the Next build but Windows denied OpenNext's required pnpm symlink during server packaging. Re-run this in Linux CI during Task 10; do not claim the Worker bundle passed locally.
- Usage at checkpoint: five-hour remaining 69%, weekly remaining 64%. No reset credit was used.
- Blockers: Linux CI is still required for final OpenNext bundle evidence. Docker Desktop is healthy; the disposable MongoDB replica set and standalone comparison node are running locally.

## Task 3 implementation evidence

- RED captured: `database.e2e-spec.ts` initially failed because the transaction runner and migrations did not exist.
- Added pinned MongoDB driver 7.6.0, disposable replica-set and standalone services, replica-set initialization, unique per-test databases, the singleton Nest database module, shared provider tokens, bounded connection pools, single-session transaction execution, additive migration tracking, validators, and M0/M1 indexes.
- Docker Desktop recovered and both disposable MongoDB services reached healthy state. Replica-set initialization selected a PRIMARY at `host.docker.internal:27018`.
- The first real run exposed a MongoDB 7 driver/Jest VM incompatibility: dynamically resolved runtime metadata became empty and the server rejected the handshake. Added a narrow RED compatibility test and centralized `MongoClient` construction with the driver's explicit Node OS runtime adapter; the compatibility test then passed.
- Added real tests for rollback, occupied-seat uniqueness, idempotent migrations, and standalone rejection. All four pass against the disposable services.
- `pnpm db:migrate` passed twice against an isolated database. `pnpm check`, the compiled Better Auth import check, and `git diff --check` pass.

## Task 4 implementation evidence

- RED captured: `authority.e2e-spec.ts` initially failed because the authority lease module did not exist. The stricter process-boundary acceptance test separately failed until its real-process harness was added; its sandboxed run also demonstrated the expected Windows `spawn EPERM` boundary before the approved full-permission run passed.
- Added MongoDB-server-time conditional acquisition, monotonic epochs and lease revisions, 30-second leases, 5-second renewal, conservative local validity deadlines, transactional fencing with stable `AUTHORITY_LOST`, conditional release, and bounded standby retry.
- Startup cleanup runs only after ownership and fences its transaction before closing older open rooms and clearing active seats. Already-closed records are untouched.
- `/health/deploy` verifies database/schema health without requiring authority. `/api/health/ready` returns 503 for standby or expired authority and 200 only after owner cleanup. Shutdown marks readiness false and stops authority timers before releasing the lease; database closure remains in the later application-shutdown phase.
- The authority acceptance suite passes 8/8 against the disposable replica set, including two independently spawned Nest backend processes. Fresh `pnpm check` passes 21 tests and all production builds.

## Task 5 implementation evidence

- RED captured: Worker proxy tests initially failed because `worker/proxy.ts` did not exist; the backend proxy suite initially failed because `common/proxyGuard.ts` did not exist.
- Added exact `/api` and `/socket.io` path matching, HTTPS-only configured origins, fixed upstream construction, hostile forwarding/secret header replacement, public-origin checks for mutations and socket handshakes, manual redirects, 15-second non-upgrade timeout, uncached streaming responses, and multi-cookie preservation.
- Added a custom Worker entry that sends backend paths through the proxy and delegates all other requests to the generated OpenNext worker. Wrangler now points at that entry.
- Added a timing-safe backend proxy-secret guard before application routes. Only `/health/live` and `/health/deploy` are direct-host exceptions; readiness remains protected.
- Added NestJS/Socket.IO transport attachment with a secure adapter that enforces the proxy secret and exact public origin at the Engine.IO handshake boundary, including requests that bypass Express middleware.
- A raw Engine.IO WebSocket handshake proves valid proxied traffic receives HTTP 101. Forged secrets and hostile origins are rejected. Worker coverage proves upgrades retain their headers and unwrapped switching-protocol response.
- Added backend timeout handling as an uncached 504, request-body/cookie streaming coverage, invalid backend-origin coverage, and explicit frontend delegation for non-backend lookalike paths.
- Shutdown now follows the full lifecycle requirement: Nest disposes Socket.IO before authority release, while MongoDB stays available until conditional release completes. A live-upgrade regression test observed the original wrong order in RED and the corrected order in GREEN.
- Frozen installation and fresh `pnpm check` pass. The Linux-only OpenNext bundle remains deferred to Task 10 as already recorded; Task 5 local acceptance is complete.

## Task 2 implementation evidence

- Ported the approved blue/white lobby into the Next.js App Router application with real semantic actions, a compact responsive companion treatment, design tokens, Lucide icons, and documented provisional artwork provenance.
- Removed prototype-only balances, unfinished navigation, demo invitation codes, query-string invitations, and functional poker claims from the production shell.
- Added accessible modal messaging for the intentionally not-yet-connected room actions. Native Escape handling closes the dialog and restores focus to the initiating action.
- Added colocated Vitest behavior coverage and isolated Playwright browser coverage. Visual screenshots at all three required viewports showed no horizontal clipping and retained action-first hierarchy.

## Approved direction

Read design.md and docs/design/approved-theme-v4.png. Blue Archive-led white/blue UI, small supporting character, restrained Genshin celestial gold accents and Wonderland mirror, watch, rabbit, tea and checkerboard details. Earlier dark moonlit concepts are superseded. Looking Glass Club and Alice remain provisional names.

## Completed deliverable

Static interactive prototype in prototype/. Start from the repository root with:

```powershell
node prototype/server.cjs
```

Preview: http://127.0.0.1:4173. Server binds to localhost only. It was running in exec session 62774 at this checkpoint; verify availability before restarting. Browser deliverable tab was left on the lobby with viewport override reset.

Files:
- prototype/index.html: lobby, room dialogs, waiting room, collection and invitation preview screens.
- prototype/styles.css: desktop/tablet/phone layouts and reduced-motion styles.
- prototype/app.js: local create/join validation, sample invitation TEA123, copy-link feedback, navigation and dialogs.
- prototype/server.cjs: dependency-free local static server.
- prototype/assets/hostess.png: original generated character illustration.
- prototype/README.md: startup instructions, scope limits, art provenance and exact generation prompt.
- docs/design/lobby-prototype-plan.md: completed task list.
- docs/design/lobby-prototype-review.md: verification results and limitations.

## Evidence and fixes

Browser checked: blank room-name rejection, literal HTML-like names rendered safely, created host waiting room, sample guest waiting room, malformed/unknown/external invitations rejected, same-origin invitation URL accepted, copy success, preview navigation, ticket information, Escape handling and focus return. Browser warning/error log was empty during the exercised flows.

Inspected 1440 px desktop and 360 px phone; measured 900 px intermediate layout. Fixed desktop overflow from the decorative orbit. All three widths have no horizontal document overflow. Phone dialog fits within viewport. Added descriptive ticket-button accessible name and minimum touch sizes. Simplified repetitive slogans into concrete action copy.

Node syntax checks and local asset-reference checks passed. Original plan.md remains unchanged. See the review document for what was not exercised (clipboard-denial fallback, OS reduced-motion setting, exhaustive accessibility/cross-browser checks).

## Boundaries

No real backend, authentication, multiplayer, poker engine, economic transactions, or pulls. Sample balances and rooms are local demo data. Collection and Invitations are descriptive preview screens. This prototype does not replace the planned Next.js/NestJS production architecture.

## Previous prototype and resume guidance

The prototype is complete within its demo scope and the user said it looks good. The visual direction is sufficient for implementation planning; the remaining screens receive milestone-specific reviews as they are built.

Read docs/superpowers/plans/2026-09-26-design-to-production.md next. It integrates the approved design into the existing plan.md section 19 without duplicating backend work. M0/M1 tasks are detailed; M2–M5 are a dependency roadmap requiring their own executable plans after relevant proposed rules are resolved.

Important production differences: 24-character room titles (prototype allows 40); secure fragment invitation tokens (prototype six-character codes/query-string links are demo only); no fake ticket balance or unfinished production navigation before its milestone. Tasks B–E expand existing frontend task 9, not a second competing implementation.

Confirmed M1 decisions replace the older proposals: invite-only email/password with no outbound email, participant-only room access, and explicit tab/device takeover. The repository is no longer an untracked planning checkout; the reviewed design and prototype are committed on `dev`. Resume from the first incomplete task recorded above and trust the execution ledger plus Git history over conversational memory.
