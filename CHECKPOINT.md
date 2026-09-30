# Checkpoint — M2 poker implementation

Updated: 2026-09-30. The active task branch is `codex/m2-poker`, tracking
`origin/codex/m2-poker`. The user requested a save point; M2 Tasks 1–9 and the
CI migration-test fix were committed and pushed. PR [#9](https://github.com/24-HUB/poker-game/pull/9)
targets `dev`; the user merges manually.

## Current M2 save point

- PR #9 review follow-up addressed three findings: old start retries
  replacing a newer session, publication clearing a pending departure, and
  deadline-crossing commands failing to publish the timeout transition.
  Regression cases were added first. [RED CI](https://github.com/24-HUB/poker-game/actions/runs/36577570585/job/109437020317?pr=9)
  reproduced all three failures (3 failed, 99 passed). The fixes now preserve
  the newer controller session, use a read-only publication snapshot for
  connected room sockets, and publish deadline-triggered transitions. The
  [GREEN CI run](https://github.com/24-HUB/poker-game/actions/runs/36653430633/job/109692481770?pr=9)
  passed frozen install, migration idempotency, `pnpm check`, and the Worker
  build on the final code. Docker Desktop recovered; `pnpm db:init` initialized
  the disposable local replica set. The focused poker Chromium flow passed 1/1,
  and the full Playwright suite passed 12/12. The fixes are saved in `a0c29b73`.

- Plan: `docs/superpowers/plans/2026-09-29-m2-poker.md`; the ignored execution
  ledger is `.superpowers/sdd/2026-09-29-m2-poker/progress.md`.
- Committed: shared poker contracts, deterministic engine and betting, durable
  sessions, serialized actions/timers, atomic chip settlement, private socket
  snapshots and restart cleanup, and a responsive playable table.
- Task 8 verification: web typecheck, all 47 web unit tests, and the Next
  production build passed. Task 6 settlement/session/poker suites passed 25/25.
  Task 7 private gateway/recovery suites passed 2/2. The M2 aggregate check
  passed in Linux CI; the complete browser suite passed 12/12 locally on
  2026-09-30.
- Task 9 browser test reached room start, private cards, a committed fold
  result, carried stacks, and the next hand. It exposed that the table disabled
  actions during the host-requested `ending` phase. The table logic and a unit
  regression test were saved in `1cdc72ba`. The browser rerun passed.
- The Task 9 browser test, E2E stack build launcher, final-stack projection
  correction, and ending-phase action fix are in `1cdc72ba`. The working tree
  was clean at the save point. The browser flow and regression test are now
  verified.
- Draft PR #9 CI first run failed two existing migration assertions: M2 added
  version 3, while `database.e2e-spec.ts` still expected two applied versions.
  The assertions now expect three and check the new `gameSessions` collection;
  the follow-up CI run passed frozen install, two migrations, `pnpm check`, and
  the Cloudflare Worker build. See [CI run](https://github.com/24-HUB/poker-game/actions/runs/36574478478/job/109426440829?pr=9).
- The earlier automatic approval review rejected a browser rerun while the
  workspace reported no credits. The later approved runs completed both the
  focused poker test and full Playwright suite without a bypass.
- No deployment, provider provisioning, production migration, paid upgrade,
  reset-credit redemption, or M3 ticket reward was performed. M0/M1 deployed
  acceptance remains separately unauthorized.

## Earlier M0/M1 checkpoint

Updated: 2026-09-29. Status: Tasks 1–10 are locally complete on `codex/m0-m1-foundation`; PR [#6](https://github.com/24-HUB/poker-game/pull/6) targets `dev`. The [Linux CI run](https://github.com/24-HUB/poker-game/actions/runs/36510938422/job/109222664262?pr=6) passed replica-set initialization, migrations, `pnpm check`, and the Cloudflare Worker build.

## User intent and usage rule

The user approved the M0/M1 implementation plan and requested inline execution. Work is limited to local implementation and deployment preparation; no cloud provisioning, live secrets, or production database operations are authorized. Save this checkpoint at every task boundary and whenever either remaining usage window drops below 6%. Latest reading: five-hour remaining 39%, weekly remaining 28%. Never purchase or consume reset credits automatically.

## Active execution

- Branch: `codex/m0-m1-foundation`, created from fetched `origin/dev` at `01f033d0`.
- Plan: `docs/superpowers/plans/2026-09-26-m0-m1-production.md`.
- Completed tasks: Tasks 1–9 above, plus Task 10 local acceptance and deployment preparation: CI, Render/Worker configuration, environment documentation, redacted smoke tooling, and accessibility coverage.
- Current task: Task 10 local and Linux CI verification is complete; deployed acceptance remains not run—deployment not authorized. No provider was provisioned and no live secret or production migration was used.
- Next action: verify the PR check and branch freshness after this evidence checkpoint is pushed, then hand PR #6 to the user for manual review and merge.
- Verification: frozen install, controlled migrations twice, 11/11 real Chromium cases, and the original 121-test `pnpm check` passed for Task 10. The CI bootstrap fix was reproduced RED against a fresh isolated MongoDB container and passed GREEN; the updated `pnpm check` passes 122/122 tests, all workspace typechecks, and configured contracts/Nest/Next production builds. Render/Cloudflare deployment smoke remains not run—deployment not authorized.
- Worker evidence: `pnpm --filter @poker/web build:worker` completed successfully in Linux CI. Windows still denies OpenNext's required symlink during local packaging, so the local Windows Worker bundle remains unavailable.
- Usage at checkpoint: five-hour remaining 61%, weekly remaining 94%. No reset credit was used.
- Remaining limitation: live provider checks remain unauthorized. Docker Desktop is healthy; the disposable MongoDB replica set and standalone comparison node are running locally. The existing local replica-set container was not recreated, preserving the user's current disposable room data.

## PR #6 CI follow-ups

- GitHub CI failed at `pnpm db:init` with MongoDB `InvalidReplicaSetConfig`: `host.docker.internal:27018` did not map back to the Linux container during `replSetInitiate`.
- A new real-container regression test reproduced the same error before the fix, then passed after the fix. It uses a separate disposable container and leaves the currently running local database untouched.
- The replica member now uses the loopback host/port from the bootstrap URI; the Compose replica-set service listens and publishes on the same port, 27018. The root test suite includes the regression.
- A first full-suite run had one unrelated timeout because the standalone comparison container was stopped; after starting that disposable service, `pnpm check` passed 122/122 tests and all configured builds. `docker compose config --quiet` and `git diff --check` passed.
- The first Linux rerun passed replica-set initialization and migrations. It then failed at root `pnpm check` because a clean checkout had no `@poker/contracts/dist` before server typechecking. The root typecheck command now builds contracts first.
- The second Linux rerun passed typechecking, but the unquoted `dist/**` in the contracts test script expanded to files under Bash and made Vitest report no test files. Quoting the glob preserves its intended meaning on Windows and Linux. Focused contracts tests pass 5/5, and local `pnpm check` passes 122/122 tests and all configured builds.
- The third Linux run succeeded: replica-set initialization, migrations twice, `pnpm check`, and `pnpm --filter @poker/web build:worker` all passed. No deployment was performed.

## Task 10 implementation evidence

- Added a manual Render free-service blueprint with automatic deploy disabled, `/health/deploy`, bounded shutdown, pinned Node/pnpm build commands, and dashboard-supplied secret/configuration fields. No pre-deploy production migration is configured.
- Added read-only GitHub CI for `dev` pull requests/pushes: frozen install, disposable MongoDB services, replica-set initialization, two migrations, `pnpm check`, and Linux OpenNext Worker build. It contains no deploy job or provider credential reference.
- Added a bounded public deployment smoke command. Tests prove a 200 shell plus authoritative ready state succeeds and an unavailable origin fails nonzero without printing unrelated secret environment values.
- Added deployment/environment documentation and Wrangler dashboard-variable preservation. Provider provisioning, secret upload, live migration, and deployment are explicitly outside authorization.
- Added a dedicated 360×800 accessibility case covering keyboard activation, focus restoration, 44px target size, reduced motion, a long authenticated name, named sign-out, and overflow. The complete browser suite passes 11/11.
- Controlled local migrations pass twice. `pnpm check` passes 121/121 tests and configured builds. OpenNext passes Next compilation, then Windows returns `EPERM` for a required symlink; Linux CI evidence remains pending.

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

## Task 6 implementation evidence

- RED captured for the missing native auth mount, `/api/me`, application error envelope, socket acknowledgement, revocation ordering, database-outage classification, malformed payload rejection, modal focus containment, session-state distinction, and successful sign-out account clearing.
- Better Auth 1.7.6 is mounted on Express before bounded body parsing and uses its MongoDB adapter with the shared client and transactions. The exact `/sign-up/email` before-hook compares a SHA-256 registration-code digest in constant time and deletes the submitted code before account creation. Provider logging is disabled so credentials and registration codes are not emitted.
- Email/password registration enforces 8–128 characters, duplicate email behavior, native auth responses, database-backed uncached sessions, stable trusted origin, and host-only HttpOnly cookies. HTTPS cookies are mandatory for production; loopback HTTP is allowed only outside production so the committed local `.env.example` remains runnable.
- `GET /api/me` and the temporary `connection:check` event share `IdentityService`. HTTP and socket guards re-read persisted sessions for every protected operation. Revoked or expired sockets receive one `UNAUTHENTICATED` acknowledgement and disconnect; storage outages return `SERVICE_UNAVAILABLE` without fabricating logout or disconnecting a potentially valid caller.
- The responsive lobby header now renders distinct loading, unavailable/retry, unauthenticated/sign-in, and authenticated/sign-out states. Sign-up requests display name, email, password, and registration code; errors preserve inputs, pending submission is disabled, focus is contained and restored, and recovery copy tells M1 testers to contact the host because password reset is deferred.
- Bounded desktop/mobile inspection at 1440×1000 and 360×800 found no horizontal overflow. The complete Task 6 verification is recorded in Active execution above; deployed acceptance remains not run because deployment is not authorized.

## Task 7 implementation evidence

- Shared strict Zod contracts now define every M1 room command, recipient `RoomView`, and private `RoomReply`; schema tests cover mutation metadata, metadata-free sync, title/seat bounds, extra-field rejection, and private-field exclusion.
- A fenced transactional room repository, one global create queue, one bounded queue per room, and additive migration 002 provide active-membership uniqueness, persisted command outcomes, canonical-payload deduplication, invitation hashes/expiry, six-seat allocation, seat moves, leave/host transfer, and replacement cleanup.
- Invitation tokens use 32 random bytes, are returned only for create/rotate, remain only in the private retry cache, and are never stored in room or command documents. Concurrent duplicate creates coalesce to the same room and token; cache saturation rejects before mutation.
- Explicit `room:claimControl` increments the controller epoch. Observer and superseded tabs cannot mutate; a stale disconnect cannot clear newer control. Participant-only sync, monotonic connection revisions, reconnect without implicit takeover, and two-minute empty-room closure are enforced.
- Real replica-set coverage includes last-seat and cross-room membership races, lost/concurrent acknowledgements, full/expired/rotated invitations, outsider access, forged host action, payload conflict, stale boot, timestamp expiry, cache saturation, host disconnect/leave, transaction rollback before publication, and additive upgrade from migration version 1.

## Task 8 implementation evidence

- RED began with a real Socket.IO client receiving no `connection:ready`; subsequent failures exposed a shutdown/disconnect race and concurrent Better Auth test-signup transaction interference.
- Added typed client/server room events, strict event-specific command parsing, server-derived identity and connection context, exactly-once acknowledgements, post-commit recipient publication with uncached authorization, and explicit shutdown draining.
- Added 16 KiB payload, four-sockets-per-account, mutation/create/join/sync rate, and bounded room-queue enforcement. Real-client coverage includes malformed and unauthenticated acknowledgements, reconnect sync, revoked-recipient nondelivery, rate/socket/payload/queue limits, token nondisclosure, and stale-tab takeover behavior.
- Full-suite RED restored the omitted `connection:check` contract. A separate shutdown RED proved acknowledged publication and in-flight room execution could outlive shutdown; command tracking now drains both and rejects commands arriving after shutdown begins.
- Focused gateway acceptance passes 12/12. Final `pnpm check` passes 95/95 tests, all workspace typechecks, and all configured production builds.

## Task 9 implementation evidence

- RED/GREEN coverage now verifies fragment-only invitation parsing, 15-minute tab-scoped invitation expiry, stable pending command identity, monotonic room revisions, account isolation, fixed server reads, malformed envelopes, distinct unavailable session state, validated room titles, six rendered seats, host-only invitation controls, and sign-out cleanup of private room and pending invitation state.
- The web now has a shared TanStack Query session provider, a minimal Zustand room store, same-origin typed Socket.IO client creation inside effects, uncertain-command retention, secure fragment removal, automatic post-auth invitation resume, create/join forms, a recipient-specific six-seat room view, explicit takeover, rotation, seat, leave controls, and a dynamic room route. There is no functional poker start action.
- Unit coverage remains green for the integrated session, storage, command, and room-view behavior. Lost-ack coverage proves an explicit retry reuses the exact stored command object and command ID, then clears only after a definitive acknowledgement.
- A local-only proxy harness now starts a unique isolated MongoDB database, compiled Nest backend, Next dev server, and exact-path HTTP/WebSocket gateway without exposing the proxy secret. It preserves the production origin and direct-backend trust boundary.
- Real Chromium acceptance now covers signed-out fragment removal followed by signup and automatic join, two persisted accounts in distinct seats, refresh synchronization, host-only rotation, explicit takeover, stale-tab mutation controls, revoked-session cleanup, a six-member room, seventh-member rejection, deletion of the rejected pending token, cold-backend recovery, and backend-restart interruption. The combined suite passes 10/10.
- The local E2E harness exposes a bounded restart control only inside the test gateway, expires the isolated authority lease before relaunch, and supports the plan's exact `pnpm exec playwright` command on Windows and Unix. No production test endpoint or secret was added.
- Responsive populated-room screenshots at 360×800, 900×900, and 1440×1000 retain all six seats, visible connection status, and no horizontal overflow.

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
