# M3 Through Production Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement sequentially, one milestone at a time. Use superpowers:subagent-driven-development only if the user selects delegation. Checkboxes record execution evidence, not planning completion.

**Goal:** Finish persistent tickets, cosmetic collection, friends playtest, and an explicitly authorized private production launch, with recovery and ongoing operations.

**Architecture:** Extend the existing NestJS settlement transaction and authenticated API; keep poker authority and per-room queues unchanged. Next.js uses account queries for durable state and recipient-specific socket snapshots for live play. Deploy the existing OpenNext Worker, one Render authority, and Atlas replica set only after release gates pass.

**Tech stack:** Existing pnpm 10.33.0 workspace, TypeScript, Next.js, OpenNext, NestJS/Express, Socket.IO, official MongoDB driver, Better Auth, Zod, TanStack Query, Zustand, Jest/Vitest, and Playwright. Retain the lockfile; recheck runtime support before release rather than upgrading incidentally.

**Spec:** [plan.md](../../../plan.md), especially sections 4–5 and 11–16. M2 semantics come from the approved [M2 plan](2026-09-29-m2-poker.md). Existing preparation is in [deployment.md](../../deployment.md). This plan supplies the detailed remaining tasks and supersedes the later-milestone roadmap in the older design-to-production plan.

## Baseline and sequence

Execution update 2026-10-11: the user requires the four local playtest improvements
in **M5.1a** below before production. Implement them before the next hosted candidate,
then rerun the affected acceptance gates. Existing M5.1 evidence describes the earlier
revision; it does not verify these new requirements. Hosted setup still depends on
provider accounts, backup storage and concrete authorization. This update plans work;
it does not implement application behavior or authorize deployment.

Repository inspected on 2026-09-30: freshly fetched `origin/dev` is `d3aa002b`, merging M2 PR #9. M0–M2 code is present. Historical evidence records green Linux CI and 12/12 local browser cases; those checks were not rerun for this documentation task. M0/M1/M2 deployed acceptance remains unperformed. No wallet, gacha, or collection subsystem is implemented by this plan.

| Phase | Outcome | Entry and exit gate |
| --- | --- | --- |
| M0–M2 baseline | Auth, rooms, poker and chip settlement | Merged; retain regressions and complete outstanding hosted acceptance in M5 |
| M3 next | Persistent tickets and real wallet UI | Approve economy/recovery decisions; atomic reward tests and browser slice pass |
| M4 | Pull, collect, equip | M3 complete; approve catalogue rules; transactions and full collection loop pass |
| M5 | Friends release candidate | M4 complete; local hardening, authorized hosted playtest and restore drill pass |
| M6 proposed release phase | Private production cutover | M5 evidence, approved limits/recovery targets, explicit production authorization |
| M7 proposed operating phase | Sustainable maintenance | Production accepted; operator, backups, incident process and review cadence assigned |

M6/M7 expand the operational work originally grouped into M5; they do not add gameplay. Complete M5 hosted/restore evidence before calling the original friends-release milestone verified. The immediate implementation task is **M3.1**, followed by M3.2–M3.4. A merged plan alone does not authorize executing every milestone.

Production means an invite-only release for the existing small group, initially one active room, with persistent real account progress. Public matchmaking, purchases, trading, multiple backend authorities, an uptime SLA, and durable live-hand recovery remain out of scope. A public or always-on launch needs a separate scope/budget decision.

## Global constraints and unresolved decisions

- Every implementation session fetches origin; each new task starts clean on `codex/<task>` from `origin/dev`. Follow-up work stays on its existing task branch/PR. Every PR targets `dev`; the user merges manually. Never automatically integrate a newer `origin/dev`.
- Do not provision, deploy, upload production secrets, run live migrations, or enable billing during planning. An authorized release operator approves the concrete environment, revision, database actions and rollback plan before deployment.
- Reuse existing `SettlementCandidate`, `CommittedHandResult`, `TransactionRunner`, auth guards, proxy guard, lease fencing and room queue. Client fields never establish identity, rewards or ownership.
- Transactions use one `ClientSession`, sequential operations, and no external effects inside a retryable callback. Resolve unknown commits through existing receipt/majority-read behavior before resuming room progression.
- Initialize zero wallets idempotently for existing and new verified accounts. No historical M2 reward backfill, permanent chip balance, or automatic starting-ticket grant.
- Before M3 rewards ship, resolve verified account access and recovery. Recommended private-release approach: verify email and support expiring, single-use email reset links using Better Auth's supported interfaces; approve provider, sender, quota and budget first. If unavailable, block reward release until the user approves a separately specified operator-assisted recovery policy. Never trust an unverified email alone as recovery proof.
- M3 economy proposals still need approval: participation 1; positive-net bonus 1; manual action required (manual fold counts, automatic-only and forced-blind-only hands do not); 20 per UTC day; participation takes the last available ticket. Freeze a policy version and the hand completion UTC date.
- M4 proposals still need approval: single/ten pull 5/50 tickets; R/SR/SSR 70/25/5%; SR+ guarantee at 10, SSR at 90; owned SSR exclusion until complete; duplicates have no refund; six avatars plus six card backs (6 R, 4 SR, 2 SSR). Original or licensed assets only.
- Operating targets approved 2026-10-07 for M5: backup after each play session and before each release; maximum tolerated loss is progress since the last successful backup; recovery within one operator-attended day. The user is the operator; retention is seven recent session backups plus the latest pre-release backup until the next release is verified. Encrypted external destination/budget remain pending. These are targets to measure, not guarantees. If insufficient, revisit hosting/backup budget before launch.
- Read directory-specific AGENTS.md before implementation. Preserve the approved visual theme and deliver a usable frontend in each milestone.

## Verification conventions

Existing commands: `pnpm install --frozen-lockfile`, `pnpm check` (typecheck, tests, production builds), `pnpm --filter @poker/web build:worker`, `pnpm --filter @poker/web exec playwright test`, `pnpm db:init`, `pnpm db:migrate`, and `pnpm smoke:deployment`. No lint script currently exists; do not claim one ran. Run the Worker build in Linux CI as existing documentation requires. CI currently does not run Playwright; M5 adds it.

Use disposable replica-set databases for all automated writes. Each code task: add the named regression tests, observe the intended failure, implement, run focused checks, then commit only owned files. At each milestone run the aggregate checks, real transport/browser cases, and review complete diff plus `git diff --check`. Commands referring to new files below become usable only when those files are created. Update `plan.md` and checkpoint evidence with actual results and blockers. Failed or unavailable required checks mean a draft PR.

## Review focus

1. Midnight/cap races across rooms: a shared wallet write conflict and frozen UTC date prevent excess or shifted rewards (M3.2).
2. Lost settlement notification or restarted backend: completed records recover once; aborted and historical M2 hands receive nothing (M3.2–M3.4).
3. Two tabs spend the last tickets or reuse an ID with different payloads: at most one affordable debit, immutable account-scoped receipt (M4.2–M4.3).
4. Equipment changes during a deal: all recipients see the same hand-boundary equipment; no card identity leaks through cosmetics (M4.4).
5. Bad release or partial backup: one backend remains authoritative, compatible rollback preserves committed economy, restore is tested outside production (M5.2–M6.2).

## M3 — Persistent tickets

### M3.1 — Resolve account recovery and freeze reward contracts

**Files:** Modify `plan.md`, `apps/server/src/modules/identity/{auth.ts,identity.module.ts}`, `apps/server/src/config/server-config.spec.ts`, `packages/contracts/src/{index.ts,poker.ts}`. Create `packages/contracts/src/{tickets.ts,tickets.test.ts}`, `apps/server/src/modules/identity/accountEmail.service.ts`, and `apps/server/test/account-recovery.e2e-spec.ts`. Update existing sign-in UI after reading web instructions; add recovery UI files under `apps/web/src/features/auth/` and browser coverage `apps/web/e2e/account-recovery.spec.ts`.

**Interfaces:** Define `RewardPolicy` with version, participation, winBonus, dailyCap and eligibility values. Define `RewardReceipt` with hand/account IDs, policy version, UTC date, qualification/reason, requested/granted participation and bonus; `WalletView` with balance, revision, utcDate, earnedToday, dailyCap, remainingToday. Transport dates are ISO strings and counts safe nonnegative integers. Recovery delivery consumes provider-generated link/token and a validated recipient in `AccountEmailService`; never construct tokens independently or log links.

- [x] Record approval of economy values and the recovery/provider decision; define account verification rollout for existing accounts without changing account IDs or balances.
- [x] Write `rejectsUnsafeTicketCounts` and `rewardReceiptExplainsZeroAward`; assert invalid fractions/negative counts fail schema parsing and explicit ineligible/capped reasons survive serialization.
- [x] Write recovery tests: expired/reused token rejected; generic response for unknown address; rate limits; reset invalidates prior sessions/socket access; verification keeps account identity; provider outage gives safe retry behavior. Observe failure before implementing.
- [x] Implement auth integration with the pinned provider's supported API after checking its official docs. Add server-only configuration validation, redirect allowlist and a fake email delivery adapter for isolated tests; no live email is sent by tests.
- [x] Run `pnpm --filter @poker/contracts test` and `pnpm --filter @poker/server test -- account-recovery.e2e-spec`; run the new recovery browser case with actual local auth and test mail capture. Record any live-provider verification still pending M5.
- [x] Commit: `feat: define ticket policy and recoverable accounts`.

### M3.2 — Extend the existing hand transaction with rewards

**Files:** Create `apps/server/src/database/migrations/004-tickets.ts`, `apps/server/src/modules/tickets/{tickets.module.ts,tickets.repository.ts,rewardPolicy.ts,rewardPolicy.spec.ts}`, and `apps/server/test/tickets.e2e-spec.ts`. Modify `database/migrate.ts`, `modules/settlement/{settlement.repository.ts,settlement.service.ts,settlement.module.ts}`, and `test/{database.e2e-spec.ts,settlement.e2e-spec.ts}` under `apps/server/`.

**Interfaces:** Pure `calculateReward(input: { dealtIn: boolean; manualAction: boolean; netChips: number; earnedToday: number }, policy: RewardPolicy)` returns qualification, requested amounts and granted amounts. `TicketsRepository.ensureWallet(accountId: string): Promise<void>` is idempotent setup. `awardHand(candidate: SettlementCandidate, session: ClientSession): Promise<RewardReceipt[]>` operates inside the existing settlement transaction, after wallet setup and before commitment. Extend committed results with a versioned optional reward summary; old M2 results remain readable with no retroactive awards. Pin reward policy at session start and include its version in the frozen settlement candidate/hash; update session creation and repository types accordingly.

- [x] Write policy cases: qualifying positive net yields 2, qualifying loss/manual fold yields 1, no manual action yields 0, earned 19 yields participation 1/bonus 0, earned 20 yields 0. Tie payout without positive net gets no bonus. Confirm failures.
- [x] Add collection validators and unique keys from plan section 11 for `ticketWallets`, `ticketLedger`, `dailyEarnings`, `rewardReceipts`; run migration twice locally. Keep receipt retention permanent for idempotency; record policy version in durable results.
- [x] Initialize participant wallets before settlement using verified account IDs. Within one transaction, claim hand revision, touch involved wallets in ascending account-ID order including zero awards, apply daily cap, write receipts/credits/counters, and update completed hand/session stacks. No second transaction after hand completion and no nested transaction runner.
- [x] Write real replica-set cases: duplicate candidate credits once; changed candidate conflicts; concurrent hands for one account never exceed cap; frozen 23:59:59 UTC candidate retries after midnight without changing its reward date; fault after each write rolls back all effects; uncertain commit reconciles once. Assert wallet equals ledger sum and each hand/account has exactly one receipt, including zero awards.
- [x] Test aborted hands, stale authority and existing M2 completed results create no rewards. Restart after commit retains rewards; restart before commit aborts the unsettled hand. Preserve the settlement pause until commitment resolves.
- [x] Run `pnpm --filter @poker/server test -- tickets.e2e-spec settlement.e2e-spec database.e2e-spec` and policy unit tests. Commit: `feat: settle hand rewards atomically`.

### M3.3 — Authenticated wallet reads and post-commit invalidation

**Files:** Create `apps/server/src/modules/tickets/{tickets.controller.ts,tickets.service.ts}` and `apps/server/src/realtime/accountPublisher.ts`; modify `apps/server/src/{app.module.ts,realtime/realtime.module.ts}`, contracts exports, and existing settlement publication outside the transaction. Add `apps/server/test/wallet.e2e-spec.ts`.

**Interfaces:** `TicketsService.getWallet(accountId: string, now: Date): Promise<WalletView>`; `GET /api/wallet` uses authenticated identity and the existing response envelope. `AccountPublisher.changed(accountId: string, revision: number): Promise<void>` emits `account:changed` only to current authorized sessions for that account. The notification is an invalidation hint, never the new balance authority.

- [x] Write `walletCannotReadOtherAccount`, `newAccountStartsAtZero`, `midnightReadResetsAllowanceNotBalance`, `revokedSocketReceivesNoAccountEvent`, and `commitWithoutNotificationStillRefetches`; observe failures.
- [x] Implement uncached reads, current-day allowance, auth/proxy checks, and private post-commit invalidation. Missed notifications do not change settlement success; no socket effects enter retryable callbacks.
- [x] Run `pnpm --filter @poker/server test -- wallet.e2e-spec` with real HTTP sessions and Socket.IO clients. Commit: `feat: expose authenticated ticket balances`.

### M3.4 — Wallet and hand reward UX

**Files:** Create `apps/web/src/features/wallet/{WalletSummary.tsx,HandReward.tsx,useWallet.ts,WalletSummary.test.tsx}` and `apps/web/e2e/tickets.spec.ts`; modify existing game shell, poker result component and account query/socket wiring after inspecting actual filenames.

**Interfaces:** `useWallet()` returns the authenticated `WalletView` query using existing API envelope/schema validation. `HandReward` receives only the viewer's committed receipt. Missing receipt means unconfirmed or legacy/no-rewards, never an optimistic award.

- [x] Write cases for loading versus zero balance, capped/ineligible explanation, pending settlement, lost event followed by focus/reconnect refetch, UTC day rollover, and account-switch cache clearing. Observe failures before wiring UI.
- [x] Render real balance, remaining daily allowance and per-hand award. Schedule/refetch allowance across UTC midnight while visible. Preserve uncertain operation messaging and keep betting controls usable.
- [x] Run `pnpm --filter @poker/web test` and `pnpm --filter @poker/web exec playwright test e2e/tickets.spec.ts`: two real accounts play qualifying hands, see correct awards, refresh/reconnect, sign out/in and retain balance. Inspect desktop and 360 px mobile layouts, focus and reduced motion.
- [x] Run milestone aggregate checks, record evidence and remaining hosted recovery checks. Commit: `feat: show persistent tickets and reward outcomes`. Submit M3 PR to `dev` for manual merge.

### M3 local execution evidence — 2026-09-30

M3.1–M3.4 are implemented on `codex/m3-persistent-tickets`, PR #12 to `dev`.
The planned commit splits were consolidated into task save points and a final
verification commit. Actual browser paths are `apps/web/tests/e2e`; settlement
and wallet cases use the existing integration suites instead of a separate
`tickets.e2e-spec.ts`. These path changes reuse the established test harness.

`pnpm check` passed with 129 server tests, 56 web tests, 12 contract tests,
18 engine tests, typechecks and production builds. Subsequent focused checks
passed 15 settlement cases (including replacement before/after commitment) and
8 recovery cases (including explicit redirect rejection). Full Chromium passed
13/13 after the review fixes; desktop hand reward and 360px recovery/wallet
screenshots were inspected. Three final review findings were fixed with failing
regressions: coherent wallet snapshot reads, server-disconnect auth refresh,
and trusted client-IP rate limiting. Account cache clearing also has a regression.

[Linux CI](https://github.com/24-HUB/poker-game/actions/runs/36706649965/job/109858354540?pr=12)
passed on code commit `6c3b9493`, including migration idempotency, aggregate
checks and Cloudflare Worker packaging. Live Brevo setup,
delivery proof and hosted acceptance remain M5 authorization gates; no deployment
or production database work occurred. Unknown future policy versions currently
produce no reward; reject unsupported versions when introducing another policy.

## M4 — Cosmetic collection loop

Implementation evidence - 2026-10-01: user approved the launch rules and original
celestial catalogue. Actual routes are `/pulls` and `/collection`; browser tests
are in `apps/web/tests/e2e/collection.spec.ts`. Pure/transaction/API and both-slot
snapshot tests, web recovery/account-switch/reduced-motion cases, and the real
earn, interrupted pull, equip, next session and re-login flow pass.
Full Chromium passed 14/14; workspace checks/builds passed, with later suites at
169 server and 68 web tests. The per-step commit suggestions are consolidated
into one M4 task PR targeting `dev`; exact commits/CI are in CHECKPOINT.md.
All publication so far used disposable databases. M5 stays pending.

### M4.1 — Immutable catalogue and pure draw policy

**Files:** Create `packages/contracts/src/{collection.ts,collection.test.ts}`, `apps/server/src/modules/gacha/{drawPolicy.ts,drawPolicy.spec.ts,catalogue.ts,gacha.module.ts}`, `apps/server/src/database/migrations/005-collection.ts`, `apps/server/scripts/publish-catalogue.ts`, `apps/web/public/art/cosmetics/manifest.json`, and twelve optimized licensed/original assets there. Modify migration registration, contracts exports and `apps/web/public/art/README.md` for provenance.

**Interfaces:** `BannerVersion` fixes ID/version, prices, rarity weights, guarantees and item pools. `drawOne(config: BannerVersion, progress: BannerProgress, ownedIds: ReadonlySet<string>, randomInt: (maxExclusive: number) => number): DrawResult` returns item, rarity, duplicate and updated pity. `publishCatalogue(db: Db, config: BannerVersion): Promise<void>` inserts immutable versions and rejects changing existing content; execution against live data requires authorization.

- [x] Approve the M4 proposals and concrete asset catalogue; validate exactly 12 unique items, slot/rarity distribution, nonempty rarity pools and safe asset URLs. Record licensing and reserve built-in defaults outside pulls.
- [x] Write deterministic boundary cases: ninth failure followed by guaranteed SR+; 89 failures followed by SSR; SSR guarantee wins both thresholds; SR resets SR+ only, SSR resets both; SR guarantee retains base SSR chance; first SSR in a batch excludes it from the next draw until all SSR owned; complete pool permits duplicates. Observe failures.
- [x] Implement pure policy with injected unbiased integer randomness, uniform eligible item selection and no database/network calls. Add catalogue validation, indexes/validators for banner progress, receipts, ownership and equipment as specified in plan section 11.
- [x] Verify migrations twice, catalogue immutability and deterministic policy tests using `pnpm --filter @poker/server test --runTestsByPath src/modules/gacha/drawPolicy.spec.ts` and database tests. Commit: `feat: define versioned cosmetic catalogue and draw rules`.

### M4.2 — Atomic pull purchase and receipt recovery

**Files:** Create `apps/server/src/modules/gacha/{gacha.controller.ts,gacha.service.ts,gacha.repository.ts}`, `apps/server/src/modules/collection/{collection.module.ts,collection.repository.ts}`, and `apps/server/test/gacha.e2e-spec.ts`; modify server module wiring and ticket repository for a shared transaction debit.

**Interfaces:** `PullRequest = { requestId: string; bannerVersion: string; count: 1 | 10 }`. `GachaService.pull(accountId: string, request: PullRequest): Promise<PullReceipt>` and `findReceipt(accountId: string, requestId: string): Promise<PullReceipt | null>`. Receipt includes payload hash, immutable banner version/price, ordered results, duplicate flags, resulting pity and committed timestamp. Expose `GET /api/banner`, `POST /api/pulls`, `GET /api/pulls/:requestId` with session/proxy/origin checks and bounded rate limiting.

- [x] Write replica-set tests before implementation: 5 tickets permits one single pull; two parallel singles from 5 charge exactly once; identical ID returns same receipt; changed count/version under same ID conflicts; different accounts may use same ID independently; insufficient funds leaves no receipt/debit/pity/ownership changes.
- [x] Initialize wallet/progress idempotently. Within one transaction find receipt first, increment wallet revision, validate current banner, conditionally debit, process draws sequentially with updated ownership/pity per draw, then commit ledger, ownership, pity and receipt together. Return an existing receipt before rejecting its now-stale banner version. Duplicate-key races resolve to the winning matching receipt.
- [x] Add failure injection after debit/ownership/pity writes; assert full rollback. Retry after an uncertain commit returns only committed results. Concurrent reward and pull preserve wallet/ledger and cap invariants. Spending never replenishes daily earning allowance.
- [x] Run `pnpm --filter @poker/server test --runTestsByPath test/gacha.e2e-spec.ts test/settlement.e2e-spec.ts`; verify privacy of receipt lookup and logs. Commit: `feat: commit cosmetic pulls with durable receipts`.

### M4.3 — Pull screen with reload-safe pending identity

**Files:** Create `apps/web/src/app/(game)/invitations/page.tsx`, `apps/web/src/features/invitations/{Banner.tsx,PullReveal.tsx,pendingPull.ts,pendingPull.test.ts}`, and `apps/web/e2e/pulls.spec.ts`; modify account navigation/query wiring.

**Interfaces:** `savePendingPull(accountId: string, request: PullRequest): void`, `readPendingPull(accountId: string): PullRequest | null`, and `clearPendingPull(accountId: string): void` retain original identity across refresh in tab storage. Store no session cookie or unrevealed private data. Reconcile using receipt lookup or identical POST; a missing receipt after an uncertain request alone does not justify a new request ID.

- [x] Write cases for refresh during POST, same ID after timeout, account switching, unavailable storage, stale catalogue and explicit rejection versus uncertain network result. Storage failure disables purchase with recovery guidance before sending a debit request.
- [x] Display cost, odds, guarantees, owned/duplicate rules and insufficient balance before submission. Reveal only committed ordered results; skip and reduced-motion reveal have identical durable outcomes. Clear pending identity only on committed receipt or definitive rejection; reauthentication recovers the original account's operation.
- [x] Run web tests and `pnpm --filter @poker/web exec playwright test collection.spec.ts`; interrupt reveal, reload and retry, asserting one ledger debit and stable results. Inspect mobile and keyboard flow. Commit: `feat: add recoverable cosmetic pull experience`.

### M4.4 — Ownership, equipment and next-hand snapshots

**Files:** Create `apps/server/src/modules/collection/{collection.controller.ts,collection.service.ts}`, `apps/server/test/equipment.e2e-spec.ts`, `apps/web/src/app/(game)/collection/page.tsx`, `apps/web/src/features/collection/{Collection.tsx,EquipmentPicker.tsx}`, and `apps/web/e2e/collection.spec.ts`. Modify `apps/server/src/modules/rooms/{game.service.ts,session.service.ts}`, game projections, shared poker contracts and existing card/avatar renderers.

**Interfaces:** `GET /api/collection`, `GET /api/equipment`, `PUT /api/equipment/:slot` with `{ itemId: string | null; expectedRevision: number }`. `CollectionService.equip(accountId, slot, itemId, expectedRevision)` returns committed equipment with revision or conflict. `snapshotEquipment(accountIds: readonly string[], session: ClientSession)` returns one consistent selection set for the durable next-hand boundary; capture it once and project that frozen set throughout the hand.

- [x] Write tests for unowned item, wrong slot, default null item, competing tab revision, missed notification recovery and equipment races at deal. An active hand's visuals remain unchanged; next hand shows the committed selection to every authorized player.
- [x] Implement owned-item reads, bounded pagination, ownership/slot checks, optimistic revision match and account invalidation. Render current versus next-hand selection clearly. Assets never encode or reveal another account's hole-card value.
- [x] Run server equipment tests and browser earn → pull → equip → next hand → reconnect → sign out/in with two independent accounts. Test both slots, long names, empty collection and card readability at 360 px.
- [x] Run milestone aggregate checks including M3 reward/pull concurrency. Commit: `feat: equip owned cosmetics at hand boundaries`; submit M4 PR to `dev` for manual merge.

## M5 — Friends release candidate and hosted acceptance

### M5.1 — Full-flow regression, CI and release controls

**Files:** Modify `.github/workflows/ci.yml`, `render.yaml`, `apps/server/src/config/`, `apps/server/src/modules/rooms/`, and `docs/deployment.md`; create `apps/web/e2e/release.spec.ts`, `apps/server/test/release-controls.e2e-spec.ts`, and `docs/release-checklist.md`.

**Interfaces:** Proposed server-only `ALLOW_NEW_SESSIONS` and `ECONOMY_WRITES_ENABLED` validated settings support controlled maintenance; ordinary browser input cannot alter them. Session admission enforces one active room globally at launch under existing backend ownership fencing. Maintenance blocks new purchases/sessions, still permits receipt reads and resolves already in-flight durable work; existing hands drain or explicitly abort under documented restart semantics.

- [x] Test limits and maintenance races before implementing: a second room cannot start while another session is active; retries cannot bypass admission; already committed receipt replay remains available; blocked new writes do not corrupt balances. No fake keep-alive or extra authority instance. Locally verified 2026-10-08 on `codex/m5-maintenance-controls`; checkpoint records final checks and PR. Startup settings default closed in production; no deployed setting changed.
- [x] Add CI Playwright execution with required browser/system dependencies and disposable DB configuration. Preserve current aggregate checks and Worker build. Restrict artifacts and redact tokens/private cards rather than publishing sensitive traces. Implemented 2026-10-06; candidate `b614e003` Linux suite passed 14/14 on 2026-10-07, including Worker packaging; no media/report uploads.
- [x] Fix the actual deployment build gap: `render.yaml` previously built contracts then server but omitted the poker-engine dependency. Shared `pnpm build:server` now builds both dependencies before Nest and is exercised before other CI builds. Old clean-source build failed; exact new command passed without cached `dist`. Node 22 LTS, explicit Render version pin and existing OpenNext adapter were rechecked; dependencies were not upgraded.
- [x] Run full browser/Socket.IO suite, two/six-player flows, disconnect/expiry/takeover, all-in/side-pot result readability, account separation and cold/unavailable backend states. Inspect desktop and 360 px mobile, focus, contrast, touch controls and reduced motion. Locally verified 2026-10-10 in `d4c2373c`, draft PR #18: aggregate 327 tests/builds/typechecks; final Chromium 16/16 and focused repeats 6/6, no retries. See release checklist/checkpoint for scoped visual evidence, fixed disconnect/pot defects, intermediate selector failure and candidate CI limits.
- [ ] Record release candidate commit, test reports, artifact versions, known issues, and no unresolved money-equivalent ledger/privacy/authorization defects. Commit: `test: establish private release acceptance gates`.

2026-10-06 CI/build slice on `codex/m5-release-gates`: local aggregate passed
169 server, 68 web, 15 contract, 18 engine and three script tests, typechecks and
production builds. Migration idempotency and full Chromium 14/14 passed. Independent
review found no actionable issue. Remaining maintenance/admission controls, expanded
gameplay/visual acceptance and hosted/restore gates are not complete; see
[release checklist](../../release-checklist.md) and the current repository checkpoint.

2026-10-07 follow-up `b614e003`: fixed early native game-clock dispatch with five
deterministic regressions; aggregate passed 174 server tests and unchanged other
suite counts, typechecks and builds. Two full Chromium runs passed 28/28. Earlier
Linux passed 13/14 and failed the collection actor wait; the exact failure state
was not captured. [Correction-candidate CI](https://github.com/24-HUB/poker-game/actions/runs/37617148673/job/112778136755)
passed all steps, including Worker packaging and full Chromium 14/14. Original
browser sequence, wait bounds and no-retry policy are retained with sanitized
failure diagnostics. Recheck the docs-only follow-up's final head before merge.

### M5.1a — Required local playtest UX improvements before deployment

**Verified implementation (2026-10-12):** Tasks 1–4 are complete on
`codex/m5-predeploy-ux` / PR #21. Application commit `6f358fa1` passed
[Linux CI](https://github.com/24-HUB/poker-game/actions/runs/38196054989): 374 tests,
types/builds, backup/restore, Worker packaging and 19/19 Chromium with zero retries.
Own-turn/waiting geometry keeps the original 360×800 and 1280×720 gates. Production
excludes mock UI/helper strings. Owner review/merge remains manual; hosted work
requires separate authorization. Read CHECKPOINT.md rather than repeat implementation.

**User requirements confirmed 2026-10-11:** keep a player at the current playing
room instead of letting ordinary app navigation lose the table; improve playing-room
UX/UI; generate/share only an invitation code; supply two mock accounts for testing
without manual account creation or email verification. These are release blockers.

**Scope:** preserve the existing approved blue/white design, server poker authority,
private-card projection, explicit tab control and reward/collection rules. These tasks
change navigation/presentation and local test setup, not poker strength or economy.
Use the current workspace paths; browser cases live in `apps/web/tests/e2e/`.
The user's detailed [Poker Room UX/UI specification](../specs/2026-10-11-poker-room-ux-ui.md)
is the acceptance source for Task 2; reuse the current design system throughout.

#### Task 1 — Authoritative current room and active-session navigation lock

**Files:** modify `packages/contracts/src/{rooms.ts,rooms.test.ts,index.ts}`,
`apps/server/src/modules/rooms/{room.repository.ts,room.service.ts,rooms.module.ts}`,
`apps/web/src/features/rooms/{LobbyExperience.tsx,RoomExperience.tsx,roomStore.ts}`,
`apps/web/src/components/shell/GameShell.tsx` and `apps/web/src/app/layout.tsx`;
create `apps/server/src/modules/rooms/current-room.controller.ts`,
`apps/web/src/features/rooms/{ActiveRoomBoundary.tsx,ActiveRoomBoundary.test.tsx}`,
`apps/web/src/lib/{current-room.ts,current-room.test.ts}` and
`apps/web/tests/e2e/active-room.spec.ts`; extend `apps/server/test/rooms.e2e-spec.ts`.

**Interfaces:** shared `CurrentRoom = { roomId: string; title: string; phase: 'waiting' | 'playing' }`;
authenticated `GET /api/rooms/current` returns `Result<CurrentRoom | null>`.
`RoomService.currentRoom(accountId: string): Promise<CurrentRoom | null>` resolves
the caller's open membership against the current authority, never another player's
room or browser-supplied account ID. The uncached client read is keyed by authenticated
account. An active boundary uses this summary to recover the room route, then existing
`room:sync` / game sync obtain recipient-authorized snapshots. Current-room reads must
not allocate a seat, claim tab control or expose invitations/private cards.

- [x] Write failing server cases: own waiting/playing membership returns its summary;
  outsider/unauthenticated callers cannot discover it; closed/left/old-boot rooms
  return null; a revoked session cannot query; database outage returns unavailable,
  not an invented empty membership. Write client cases for account switches and
  stale requests so one account's redirect cannot affect another.
- [x] Run `pnpm --filter @poker/server test --runTestsByPath test/rooms.e2e-spec.ts`
  and `pnpm --filter @poker/web test -- current-room.test ActiveRoomBoundary.test`.
  Expected RED: missing current-room read/boundary behavior, rather than setup failures.
- [x] Implement the read and routing boundary. While phase is `playing` (including
  an ending session until durable completion), keep navigation inside that room:
  collapse navigation while keeping Lobby/Collection/Pulls discoverable through
  the explicit leave flow with a reason; redirect unconfirmed direct app routes,
  browser Back and reload/sign-in recovery to `/rooms/<own roomId>`. A waiting room
  gets a visible **Return to room** entry in the lobby instead of a navigation lock.
  Do not rely only on in-memory room state or preserve private cards in storage.
- [x] Provide explicit **Leave room** and **Back to lobby**, plus sign-out.
  Selecting a destination during play uses this same leave flow; confirm only
  when leaving has consequences for an active hand. Cancellation or failed leave
  stays in the room; successful leave/sign-out releases the lock. Waiting/finished
  states do not require an unnecessary confirmation. Keep existing
  server behavior for a seat that leaves during a hand. Auth/recovery screens must
  remain usable when access expires. Browser/tab closing cannot be prohibited;
  reconnect must recover membership and request explicit control when needed.
  Unavailable reads show a bounded reconnect state, not redirect loops or fake logout.
- [x] Run focused GREEN suites plus
  `pnpm --filter @poker/web exec playwright test tests/e2e/active-room.spec.ts`.
  Expected: two real accounts remain isolated; Back/direct navigation/reload recover
  the same playing room; destination/leave cancellation stays at the table; confirmed
  leave, sign-out, completion and backend restart unlock safely.
  Commit: `feat: recover active rooms and keep players at their table`.

#### Task 2 — Playing-room hierarchy and usable controls

**Spec:** [Poker Room — UX/UI Implementation Specification](../specs/2026-10-11-poker-room-ux-ui.md),
sections 1–9 and the active-room integration note. Every subsection below is required.

**Files:** modify `apps/web/src/features/rooms/{PokerTable.tsx,PokerTable.test.tsx,RoomLobby.tsx,RoomLobby.test.tsx,RoomExperience.tsx}`,
`apps/web/src/components/shell/GameShell.tsx`, `apps/web/src/app/globals.css`,
`packages/contracts/src/{poker.ts,poker.test.ts}`, `apps/server/src/projections/gameProjection.ts`,
`apps/server/src/modules/rooms/{game.service.ts,session.repository.ts,rooms.module.ts}`,
`apps/server/test/poker.e2e-spec.ts`, and `apps/web/tests/e2e/{poker.spec.ts,release.spec.ts,accessibility.spec.ts}`;
create `apps/server/src/modules/rooms/hand-history.controller.ts`,
`apps/web/src/features/rooms/{PokerActionPanel.tsx,PokerActionPanel.test.tsx,HandHistory.tsx,HandHistory.test.tsx}`
and `apps/web/src/lib/{hand-history.ts,hand-history.test.ts}`. Table owns spatial
layout/seat mapping, action panel owns editing/validation, history owns disclosure/read
states; shell owns collapsed navigation. Reuse existing components/icons/tokens.

**Data interfaces:** reuse `GameView`, `LegalActionsView`, `PokerAction`, Task 1's
boundary and existing control epoch. Current `GameView` does not expose live hand
number/blinds/current bet or history; do not use `handResult.handNumber ?? 1` as a
live-hand counter. Extend the recipient projection with `handNumber`, `smallBlind`,
`bigBlind`, `smallBlindSeat: number | null`, `bigBlindSeat: number | null` and `currentBet`
from session/engine state. Add `amountStep` to the projected non-null legal raise
range, reflecting the engine's safe-integer chip unit (currently 1), without changing
legal raises. Blind markers use the same heads-up/multi-seat deal rules and seat order
as the engine, including all-in blinds; never infer them from remaining chip stacks.

Authenticated, uncached `GET /api/rooms/:roomId/hands?sessionId=<id>&beforeHandNumber=<n>`
returns `Result<{ hands: CommittedHandResult[]; nextBeforeHandNumber: number | null }>`.
`GameService.history(accountId: string, roomId: string, sessionId: string,
beforeHandNumber?: number): Promise<{ hands: CommittedHandResult[]; nextBeforeHandNumber: number | null }>`
returns that payload after rechecking current room membership
and participation in that room's requested session. Read only committed `COMPLETED`
hand documents via `SessionRepository.listCommittedHands(sessionId, beforeHandNumber?)`;
page at most 20, ordered by descending hand number, with an exclusive cursor.
Never return candidates, raw engine decks/hole cards, another account's reward receipts,
or data from an unrelated room/session. History shows committed outcomes, not action replay.

**Review focus:** preserved amount during timer/snapshot updates; short all-in limits;
stable seats after fold/disconnect; uncertain submissions without duplicate actions;
history privacy and stale results after account/session change. Each is tested below.

- [x] Add failing behavior cases for actionable takeover, start blocked with fewer
  than two seated players, waiting for another player, disconnected transport,
  pending action and session ending. Every disabled action must have an adjacent
  explanation. No observer/superseded tab may start or act, including Start new session.
- [x] Add failing contract/server cases for live hand number advancing, authoritative
  blinds/markers/current bet/increments, heads-up and short-blind cases, history
  pagination/reload, and outsider/left/revoked/cross-session denial. Assert hidden
  cards/candidate data/other-player receipts are absent; unavailable history is not
  silently rendered empty. Client tests discard previous account/session history.
- [x] Add failing action-panel cases: **Your turn** vs opponent name; Check vs Call
  amount; Bet vs Raise with total **Raise to** semantics; input/slider synchronization;
  presets change the selection without firing `onAction`; invalid/non-integer/out-of-range
  and short-all-in-only amounts block submission with inline errors. Timer/unrelated
  snapshot updates retain the edited amount; changed legal limits revalidate without
  silently submitting or replacing it. Double-click/pending sends one command; failed
  or stale commands show an error and sync legal actions. Uncertain acknowledgements
  retain the existing command identity/reconciliation flow, never blind resubmission.
- [x] Run `pnpm --filter @poker/server test --runTestsByPath test/poker.e2e-spec.ts`,
  `pnpm --filter @poker/contracts test` and
  `pnpm --filter @poker/web test -- PokerTable.test RoomLobby.test PokerActionPanel.test HandHistory.test hand-history.test`.
  Expected RED: missing metadata/history/editing/control behavior, not setup failures
  or assertions tied only to changed class names.
- [x] Implement the authoritative metadata and bounded history read, updating strict
  schemas and existing test fixtures. Keep all poker actions/rules, settlement/reward
  writes and recipient card privacy unchanged. History opens/collapses below the action
  panel without navigation, with loading/error/retry/empty states and committed winner,
  payout and result details; after reload it reads actual committed results.
- [x] Implement the specified page order: compact app header; actual room title,
  hand/phase/blinds, connection indicator plus text and room-options menu; table;
  stable action panel; collapsed history. Apply Task 1's deliberate lobby/leave route.
  Keep host **End after this hand** in room options and visibly mark ending requested.
  Separate secondary/leave controls from betting; explain observer mode and label
  takeover **Use this tab to play**. Remove revision/control jargon from primary copy.
- [x] Arrange seats relative to the caller: You at bottom, heads-up opponent at top,
  up to six seats around the perimeter in stable hand-seat order. Folding, acting,
  disconnect/reconnect and ordinary updates must not move a seat. Center the board/pot
  with subtle undealt slots; each bet sits inward near its seat. Show name/You, remaining
  stack, authorized visible/concealed cards, dealer/SB/BB markers and Folded/All-in/
  Disconnected status without overlap. Actor highlight includes text/timer as well as
  visual treatment; stack, current bet and total pot have distinct labels/positions.
- [x] Implement the stable panel below the table: readable secondary Fold, dynamic
  Check/Call amount, Bet/Raise selected amount, numeric input, synchronized slider and
  legal Minimum/Maximum presets that only edit. Derive bounds/step from legal actions,
  timer from server deadline/time, and Bet/Raise from authoritative current bet; convert
  labels to the existing `{ type: 'raise', raiseTo }` command without new poker rules.
  Preserve ordinary edits, revalidate changed limits, and show valid/invalid/pending/error
  feedback. Opponent turns/reconnecting/settling keep the panel stable and stale actions
  disabled with explanations; waiting explains player requirements; complete hands show
  winner/results/tickets. Announce actor/phase changes accessibly, not each timer tick.
- [x] Verify unit/server/contract GREEN and real browser flows at desktop 1440×1000
  and 1280×720, tablet 900×900, and mobile 360×800 with two/six accounts, long names,
  all-ins/side pots, reconnect, takeover, history and leave cancellation. Expected:
  table and primary actions together without desktop scrolling; no overlapping cards,
  names/bets/board/controls or horizontal overflow; mobile bottom panel accounts for
  safe areas and keeps your cards/essential state visible above it. Desktop controls
  form a horizontal row; tablet navigation collapses and spacing tightens while
  cards stay readable. Reduce decoration
  before shrinking readable cards/text. Check visible focus, keyboard menus/history/
  slider/input/presets, accessible names, 44×44 targets, contrast, reduced motion and
  a timer outside a per-tick live region. Inspect scoped screenshots at each breakpoint.
  Run `pnpm --filter @poker/web exec playwright test tests/e2e/poker.spec.ts tests/e2e/release.spec.ts tests/e2e/accessibility.spec.ts`.
  Keep sensitive captures local/ignored. Commit: `fix: clarify poker table controls and layout`.

#### Task 3 — Code-only room invitations

**Files:** modify `apps/web/src/features/rooms/{RoomExperience.tsx,RoomLobby.tsx,RoomLobby.test.tsx,Lobby.tsx,Lobby.test.tsx,invitation.ts,invitation.test.ts}`
and `apps/web/tests/e2e/rooms.spec.ts`; extend `apps/server/test/rooms.e2e-spec.ts`
only where new acceptance coverage is needed. Reuse existing `RoomReply.invitation.token`
and `room:join { token }`; the backend already returns a token, while the frontend builds the URL.

- [x] Write failing assertions that generation/rotation displays a selectable invite
  code and **Copy invite code** copies exactly that token, without origin/path/fragment.
  Add copy-success/failure feedback and tests for joining via pasted code, whitespace,
  empty/malformed/expired/rotated input and old-code rejection.
- [x] Run `pnpm --filter @poker/web test -- RoomLobby.test Lobby.test invitation.test`.
  Expected RED: clipboard still contains a URL and code/feedback UI is absent.
- [x] Display/share the existing cryptographically random opaque token as the code;
  do not replace it with a guessable short numeric code. Label the join input **Invite code**.
  Preserve expiry, rotation, host-only token delivery, hashing and retry-safe commands.
  Keep existing fragment-link parsing for previously shared invitations; new generation
  must display/copy only the code. Code entry must never place tokens in query strings,
  logs or persistent account storage; retain the bounded pending-sign-in storage rule.
- [x] Run unit GREEN, server room coverage and
  `pnpm --filter @poker/web exec playwright test tests/e2e/rooms.spec.ts`.
  Expected: host copies code, Guest joins by code; old links remain readable; rotation
  invalidates the old code; non-host snapshots never expose it. Commit: `feat: share rooms with invite codes`.

#### Task 4 — Two ready local accounts and accurate sign-in failures

**Files:** modify `apps/web/scripts/e2e-stack.mjs`,
`apps/web/tests/e2e/support/accounts.ts`, `apps/web/src/lib/{auth-client.ts,auth-client.test.ts}`,
`apps/web/src/features/auth/{SignInButton.tsx,SignInButton.test.tsx}` and `README.md`;
create `apps/web/scripts/local-mock-accounts.mjs` and
`apps/web/tests/e2e/local-mock-accounts.spec.ts`; isolate the local entry controls in
`apps/web/src/features/auth/{LocalMockAccounts.tsx,LocalMockAccounts.test.tsx}`.

**Contract:** the loopback test harness prepares **Mock Host** and **Mock Guest** in
its generated disposable database through ordinary auth signup, captured verification
and native sign-in. Offer clearly labelled local **Play as Mock Host / Mock Guest**
entry points; a harness-only same-origin POST helper may invoke native sign-in and
forward its session cookie. The app still uses real verified sessions/HTTP/socket guards.
No registration, inbox lookup or credential typing is required from the tester.

- [x] Write failing browser cases for both ready accounts in separate browser contexts,
  stable distinct identities, create/join by code, sign-out and harness restart into
  a fresh isolated database. Add tests rejecting unrecognised mock selectors and
  invalid/missing Origin. Production must have no mock buttons, login helper or seeded
  identities; enabling a frontend test flag alone must not grant backend access.
- [x] Correct sign-in error mapping with failing `auth-client.test.ts` cases: an
  origin/proxy/other 403 must not say **That registration code is not valid**; only
  the signup registration-code failure may use that message. Preserve wrong-password,
  unverified-email, rate-limit and unavailable states. Local setup must clearly use
  `http://127.0.0.1:3100`, not the untrusted `localhost` alias.
- [x] Run `pnpm --filter @poker/web test -- auth-client.test LocalMockAccounts.test`
  and the new browser fixture cases to capture RED, then implement the fixture/helpers and accurate error copy.
  Keep fixture creation/verification at the harness boundary; never add a production
  auth bypass, runtime balance grants or fake room players. User starts two real contexts.
- [x] Document the Windows launch verified in this session:
  `npm.cmd exec --yes --package=pnpm@10.33.0 --call "set npm_execpath=&& node apps/web/scripts/e2e-stack.mjs"`.
  Verify the launcher and nested build commands use pnpm 10.33.0 even with a global
  pnpm 12 installed. Do not edit the pinned packageManager merely to bypass its check.
- [x] Run focused GREEN and
  `pnpm --filter @poker/web exec playwright test tests/e2e/local-mock-accounts.spec.ts tests/e2e/account-recovery.spec.ts`.
  Inspect the production web build and authenticated real server transport to prove
  mock helpers are absent and normal authentication remains enforced.
  Commit: `test: provide ready local players and clarify sign-in errors`.

#### Completion gate for M5.1a

- [x] Use pinned pnpm 10.33.0 and `pnpm install --frozen-lockfile`, then `pnpm check`
  and the complete `CI=true` Chromium suite with zero retries. No lint script exists.
  Check Linux OpenNext Worker CI for the final task head. Record actual commands/results
  and scoped visual evidence; do not reuse prior passing counts for the changed candidate.
- [x] Review the whole task diff, update plan/checkpoint/release checklist, commit/push
  task-owned changes and open/update a PR to `dev` for manual merge. Keep draft while
  any gate is failing/unavailable. Re-fetch before handoff and report upstream drift.
- [ ] Only after these new requirements pass, resume M5.2 remaining storage/key selection
  and M5.3 authorized hosted acceptance. M6 production approval must name the new
  verified candidate; M5.1a does not itself authorize live resources, email or deployment.

### M5.2 — Backup, restore and incident rehearsal

**Files:** Create `docs/operations.md`, `scripts/verify-economy.mjs`, `scripts/verify-economy.test.mjs`, `scripts/support/economy-fixture.mjs` and `scripts/rehearse-backup.test.mjs`; modify `package.json`, `.github/workflows/ci.yml`, `docs/deployment.md` and `docs/release-checklist.md`.

**Interfaces:** `verifyEconomy(db: Db)` is read-only and reports aggregate counts/mismatches, never account secrets: wallet equals ledger sum, no negative balances, reward receipts map to committed hands, pull debits match receipts, ownership/progress/equipment refer to valid published assets. A CLI requires an explicit database name and defaults to refusing production targets without an operator-selected read-only mode.

- [x] Test known corrupt isolated fixtures and a valid full-loop fixture; ensure verification detects missing ledger/receipt/ownership references without repairing anything. `pnpm test:economy` builds the existing repositories and runs `node --test scripts/verify-economy.test.mjs`; final verification is recorded in the checkpoint.
- [x] Document approved backup owner, access controls, retention, disposal and recovery targets in `docs/operations.md`.
- [ ] Select encrypted destination outside repo/service filesystem and confirm storage budget/key access; the operator will supply the location.
- [x] Rehearse on isolated data: prevent new writes, finish/resolve in-flight transactions, stop all database writers including auth/session refresh, then take a consistent `mongodump` using supported Atlas Free tooling. The local drill awaits all source work, closes/revokes the fixture writer, and uses a reader; no background server runs. It uses no oplog.
- [x] Restore into a different isolated replica-set database with separate credentials and no outbound email/production proxy access. Check validators/indexes, economy invariants, sign-in using isolated test accounts, receipt replay, ownership and equipment. `pnpm test:backup` passed locally 2026-10-07; no production restore occurred.
- [x] Time the local restore, record backup timestamp/checksum and measured data loss/recovery duration; compare with approved targets. Document account compromise, quota exhaustion, broken deployment, lost database access and ledger discrepancy response in `docs/operations.md`. Local fixture results meet timing/loss targets only at this scale; hosted measurement remains M5.3.
- [x] Commit local tooling and verified incident/backup runbooks after rehearsal evidence. The task commit and draft PR are recorded in the checkpoint; external destination/key access remain pending. A future live backup/restore requires its own authorized scope.

### M5.3 — Authorized staging/private hosted playtest

**Files:** Update `docs/deployment.md`, `docs/release-checklist.md`, `plan.md` and checkpoint with dated evidence; extend `scripts/smoke-deployment.mjs` only for bounded non-destructive readiness checks.

**Entry:** M3/M4, M5.1, the newly required M5.1a local playtest improvements, and M5.2 local checks pass. Prepare exact resources, regions, hostnames, build SHA, migration/catalogue commands and secrets inventory before requesting deployment authorization. This task stays pending until authorized.

- [ ] Prefer separate playtest Worker/service/database and test accounts. Confirm combined free-tier quotas before provisioning; use disposable isolated hosted resources sequentially if simultaneous environments exceed the budget. Never point automated test suites at the live progression database.
- [ ] Recheck provider documentation below; retain actual OpenNext configuration, Node bind/PORT and `/health/deploy`. Configure fixed upstream/public origin, private proxy/auth/database secrets, restricted Atlas database user/network access, approved email settings and maintenance controls. Confirm the Render environment's outbound addresses; do not quietly substitute unrestricted database access.
- [ ] Execute migrations/catalogue publish against the explicitly authorized playtest DB before accepting traffic. Deploy backend and Worker artifacts from one recorded revision, enable one authority and verify `/health/ready`, then `pnpm smoke:deployment` with the playtest public origin. Current smoke only proves shell/readiness, so follow with authenticated tests below.
- [ ] Use real separate playtest accounts through the Worker: registration verification/recovery, secure cookies, redirects, direct-backend rejection, Socket.IO upgrade/fallback, poker → earn → pull → equip → re-login. Confirm per-account cards and cache isolation; verify committed receipts directly with authorized read-only checks.
- [ ] Exercise real idle sleep/wake (no artificial keep-alive), restart mid-hand, restart after commit, database outage and overlapping deployment fencing. Interrupted hands abort without rewards; receipts/balances survive; frontend shows bounded recovery states.
- [ ] Measure Worker CPU/errors, backend memory/wake time, request usage, Atlas storage/connections and email limits during one six-player room. Run the hosted isolated restore rehearsal. Record actual observations and blockers, not assumed quotas or service guarantees.
- [ ] Friends complete a full session on phone and desktop; record economy pacing and forced-blind/duplicate policy feedback separately from bugs. User accepts tuning changes explicitly with new policy/catalogue versions. Mark original M5 verified only when hosted and restore evidence pass.

## M6 — Private production deployment (proposed operational phase)

### M6.1 — Concrete release approval package

**Files:** Update `docs/release-checklist.md`, `docs/deployment.md`, `docs/operations.md` and `plan.md`; no provider mutations in this task.

- [ ] Record the manually merged `dev` release SHA, green checks, immutable Worker/backend artifact identity, migration versions, catalogue version, old compatible artifact IDs and named release/backup operator. Re-fetch before handoff and report upstream drift without merging automatically.
- [ ] Separate production credentials/database from disposable tests. Default is an empty live progression DB with zero wallets; do not import playtest balances. If using the tested hosted resources for the private launch, explicitly approve the data disposition before any deletion or transition.
- [ ] Review build commands, environment variable names, secret storage, restricted DB access, asset rights, account recovery delivery and provider usage against measured results. Keep automatic deploys off. No secrets in the approval document.
- [ ] Present exact cutover window, resources, migrations, catalogue publish, smoke actions and rollback behavior for explicit production authorization. Include approval of free-tier interruptions and recovery targets; if unmet, delay launch or request an approved hosting change. A PR merge does not itself authorize deployment.

### M6.2 — Deploy, validate and open invitations

**Entry:** Explicit authorization of M6.1 package; all required checks pass. Owner can stop the release at any failed gate.

1. Close admission and economy writes; drain/resolve ongoing transactions and sessions. If production data already exists, obtain and validate the approved consistent pre-release backup. Preserve latest committed progression.
2. Apply only reviewed additive/backward-compatible migrations and immutable catalogue publication using explicit production connection/database. Confirm migration idempotency and indexes. Never rely on the free Render plan for an unavailable pre-deploy hook.
3. Deploy backend artifact, verify health and exactly one fenced authority; then deploy corresponding Worker/assets. Validate public origin, proxy/auth/DB configuration and readonly routes while admission remains closed. Auth, lease and maintenance behavior must be compatible with the candidate artifact.
4. Allow only designated real smoke accounts for the release window. Verify the full loop through the public origin with ordinary game-earned tickets; no test seeding, destructive suite, or synthetic balance mutation against production. Record legitimate smoke receipts as durable data.
5. On success, open invitations to the agreed private group and monitor initial sessions. Capture deployed URLs, provider release IDs, SHA, migrations, smoke results, measured usage and known limitations in the checkpoint. Mark production verified only now.
6. On failure, close writes/admission and follow the rehearsed rollback: restore compatible backend and Worker artifacts together while preserving additive DB state and committed receipts. A binary rollback does not undo debits/rewards. If schema is incompatible, keep maintenance and prepare a forward fix; data restore is a separately authorized incident action with an explicit loss window. Do not overwrite new progress with a pre-release backup automatically.

### M6.3 — Post-launch acceptance

- [ ] Observe the first complete group session and the next return/sign-in, including natural sleep/wake; resolve critical errors before wider invitation sharing.
- [ ] Take the approved post-session backup, run read-only economy verification, inspect secret-free logs and record actual storage/CPU/connection use.
- [ ] User accepts the private-release limitations and remaining nonblocking issues; assign each issue an owner and next review. Record rollback artifact retention and backup location references without credentials.

## M7 — Ongoing operations (proposed operating phase)

| Cadence or trigger | Operator action | Evidence / escalation |
| --- | --- | --- |
| After each play session | Approved backup, economy reconciliation and failed transaction review | Timestamp/checksum, zero unexplained mismatches; pause economy on discrepancy |
| Before every release | Current origin/dev, isolated checks, migration rehearsal, backup and compatible rollback | Reviewed PR and concrete authorized release package; user merges manually |
| Weekly while in use | Provider quota/error/storage review and backup retention | Trend against published limits; reduce load or request budget before exhaustion |
| Monthly or after recovery changes | Restore latest backup into isolation and test account recovery | Measured recovery target met; investigate failed restoration before claiming recoverability |
| Security/runtime support notice | Assess supported Node/auth/framework versions and credential exposure | Focused update PR with auth/socket/Worker regressions, no blind dependency upgrades |
| Long inactivity / quota failure | Check provider pause status and last backup; explain unavailable service | Resume through approved operator procedure, never create billing or new providers silently |

No automation is created by this plan. Schedule reminders or provider monitoring only when requested. Default notification intent for any later monitor should focus on actionable failures or material changes.

## Hosting evidence and release limits

Checked 2026-09-30; recheck at provisioning and launch:

- [Render Free documentation](https://render.com/docs/free) explicitly advises against production use and describes idle spin-down after 15 minutes. The agreed free stack supports a limited private launch only if its interruptions are accepted; it is not evidence of production-grade availability.
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) describe request and CPU ceilings, including 100,000 requests/day on Free. Measure the deployed render/proxy workload before accepting this budget; do not assume passing a local build proves fit.
- [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) and [backup documentation](https://www.mongodb.com/docs/atlas/backup-restore-cluster/) state managed backups are unavailable on Free; use supported manual dump/restore with a consistent write pause and verify recovery.
- The repository actually uses `@opennextjs/cloudflare` and `build:worker`, despite the historical baseline's vinext recommendation. Keep the working adapter unless a separately reviewed compatibility change is needed.

## Completion and self-review

Coverage: economy/settlement → M3; versioned catalogue/pulls/equipment → M4; privacy/recovery/accessibility/build/hosting → M5; approved production cutover/rollback → M6; ownership and maintenance → M7. The five review-focus failures each have named task coverage. Durable operations share the existing transaction boundary, and legacy M2 results remain readable without backfill.

The original document was a planning deliverable. M3 is merged and M4 local implementation evidence is recorded above; M5-M7 execution remains pending. The next milestone after manual M4 review/merge is M5.1. Recommended execution is inline because rewards, wallet writes and settlement share one transaction boundary. No deployment or production operation has been performed by preparing this document.
