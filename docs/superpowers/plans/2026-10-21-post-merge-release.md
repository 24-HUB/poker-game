# Post-merge M5 Completion and Private Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute task-by-task, sequentially inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the outstanding hosted M5 acceptance from merged PR #35, fix reproduced defects, and prepare a separately authorized private release.

**Architecture:** Reuse the existing Next.js Worker, NestJS/Socket.IO authority, MongoDB transactions and merged operator tools. Execute the approved M5 contracts through bounded operator windows; product changes require a reproduced failure and a focused regression. Private launch remains a later, separately approved operational phase.

**Tech Stack:** Node 22.16.0, pnpm 10.33.0, existing TypeScript/JavaScript, Playwright, Docker, MongoDB Database Tools and operator-managed age.

**Spec:** [Approved M5 completion specification](../specs/2026-10-19-m5-completion-design.md). Exact M5 action sequences remain in [the October 19 plan](2026-10-19-m5-completion.md); M6/M7 requirements remain in [the production roadmap](2026-09-30-m3-through-production.md#m6--private-production-deployment-proposed-operational-phase).

Status: **Planning only, 2026-10-21 Bangkok.** This is the forward sequence after PR #35, replacing its obsolete merge-first prerequisite. Completed tooling tasks stay completed. No hosted gate, live approval or production readiness is created by this document.

Execution update **2026-10-23 Bangkok**: Task 1 started after user authorization.
The [current evidence/first proposed live packet](../../releases/2026-10-19-m5-completion.md#task-1-preflight-started--2026-10-23-bangkok)
records observed provider inventory, projected A/B baseline and successful warm
smoke, while keeping cold-wake timing and R2/R3 methods open. The dated planning
status above describes this plan's creation; it does not supersede that evidence.

## Verified starting point

- [PR #35](https://github.com/24-HUB/poker-game/pull/35) is merged into `dev` as `a76e51da7a48daadb46b24d76697a88da0187475`, observed in Git and GitHub on October 21. Its final head is `7fa334d46be2a3193748b77933fc1f823d66851a`.
- [Final PR CI 39611351308](https://github.com/24-HUB/poker-game/actions/runs/39611351308) completed successfully. Its verify job includes frozen install, uncached backend build, disposable migrations, `pnpm check`, encrypted backup rehearsal, Worker packaging and full Chromium acceptance. [Merged-dev CI 39611611127](https://github.com/24-HUB/poker-game/actions/runs/39611611127) also completed successfully on `a76e51da`.
- GitHub shows no formal reviews on PR #35. The two earlier PR #36 findings were addressed in the merged history; successful CI is not a fresh independent code review.
- October 19 Tasks 2 and the local portion of 7 are implemented: the human-run committed-response-loss runner and isolated account/receipt restore runner, including signal retention and verified container cleanup. Do not recreate them.
- Historical local evidence remains 551 tests/types/builds, backup 1/1, operator 7/7, restore/cleanup 9/9 and affected Chromium 1/1. No local application suite was rerun for this planning task.
- Provider deployment/configuration, A/B sessions/progression, mail quota and temporary-access expiry have not been inspected in this task. A merge does not establish which binary is live.

## Global constraints

- Node **22.16.0**, pnpm **10.33.0**, committed lockfile; no unrelated upgrades.
- Participation **1**, positive-net bonus **1**, UTC daily cap **20**, single pull **5 tickets**; practice and timeout-only rewards **0**. No seeding, resets or forced random outcomes on hosted data.
- Authenticated recovery bound **90 seconds**; email TTL **10 minutes**, resend cooldown at least **60 seconds**. Proposed mail ceiling **12 total**, **4 each A/B/C**, requires its named approval.
- Preserve existing A/B accounts and committed progression. The human enters/submits passwords/codes and performs hosted poker/pull actions. No live fixture suites or raw sensitive evidence in Git.
- Retain the **$0** target. No paid service, public fault endpoint, shared Atlas disruption, source restore or widened credential/network access.
- Existing approvals keep their original scope and lifetime. October 19 provider preflight was blocked by automatic approval review; planning/CI access does not authorize Render/Cloudflare/Atlas/Brevo private inspection. Obtain only missing named approval at the relevant boundary.
- New tasks start clean on a branch from freshly fetched `origin/dev`; resume existing tasks on their branch. PRs target `dev`; user merges manually. No automatic upstream integration.
- `ALLOW_NEW_SESSIONS=false` does not stop authentication/all writers; `ECONOMY_WRITES_ENABLED=false` does not stop settlement or committed receipt replay. Apply changed startup flags through an approved configuration deployment.

Capability references rechecked October 21: [Render Free](https://render.com/docs/free),
[deployment/configuration behavior](https://render.com/docs/deploys) and
[Atlas Free backup subscription](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/).
Render documents inbound-idle spin-down after 15 minutes; distinguish restart from
applying saved configuration. Atlas's optional Free-cluster backup is billed and
is not selected by this $0 plan. Public docs do not establish current account configuration.

## Review focus

1. Stale candidate or account evidence: Task 1 binds live artifacts and current UTC allowance to the actual window; older zero balances never substitute.
2. Password reset with a still-authorized socket: Task 2 retains the old HTTP/socket context until revocation is observed.
3. A committed purchase whose response/browser is lost: Task 4 reuses the original pending identity and proves exactly one five-ticket debit.
4. A restart mistaken for DB failure or controlled overlap: Tasks 1/5 require distinct process-specific trigger, commit proof and restoration; unsupported variants remain blocked.
5. A restore with missing purchases, egress or retained containers: Task 6 requires complete content, containment and successful teardown before certification.

## File ownership and evidence interfaces

| Files | Responsibility |
| --- | --- |
| `docs/releases/2026-10-19-m5-completion.md` | Append dated stage packets, methods, evidence rows and pass/fail/blocked decisions; preserve historical observations. |
| `docs/release-checklist.md`, `CHECKPOINT.md`, `plan.md` section 18 | Current candidate, milestone gates, save point and exact next action. |
| `scripts/operations/README.md`, `docs/operations.md`, `docs/deployment.md` | Change only when an observed operating procedure or approved release package changes. |
| Existing `apps/web/scripts/operators/` and `scripts/operations/` runners | Consume as merged tools; modify only under Task 8 after a reproduced defect. |
| Conditional files in Task 8 | Owning implementation plus a failing regression, selected from the reproduced trigger. |

Every stage produces the existing spec section 8 evidence row: `id`, `gate`, `candidate`, `environment`, Bangkok timestamp, alias/operator, precondition, action, expected/observed invariant, `result` (`pass|fail|blocked|not run`), sanitized evidence reference, next action. Keep private mappings and manifest/receipt contents outside Git.

Each live packet must name exact resource/artifact/configuration IDs, operator/window, aliases, baseline, actions, persistent effects, maximum sends/pulls, stop/restoration steps and approval evidence. Missing values block entry; do not execute a template. X1 safe exit applies after every window, even if a later task is blocked.

## Task 1: Refresh preflight and resolve fault-method feasibility (P1)

**Files:** Evidence/checkpoint files above. **Consumes:** verified merged candidate, spec sections 2/7/8, [October 19 Task 1](2026-10-19-m5-completion.md#task-1-refresh-candidate-and-prepare-executable-packets-p1). **Produces:** current inventory, five executable packets and a separate method decision for each R2/R3 variant.

- [x] Recheck clean status/current branch, account usage, origin fetch and exact candidate CI; record upstream drift without integrating it. Do not redeploy a documentation-only SHA just to make IDs match.
- [x] Obtain missing read-only approval for the named Render service/Blueprint, Worker, Atlas project/cluster and Brevo sender/quota. Inspect current IDs, flags, deploy triggers, rollback compatibility, free-tier headroom and actual temporary-access expiry; do not renew access.
- [x] Read fresh A/B identity/progression, UTC allowance, membership, schema/catalogue and authority baseline through authorized scope; preserve October 18 results as dated history.
- [ ] Prepare account/mail, gameplay/economy, restart/fault, backup/restore and friends/exit packets using the existing record. Inspect current sender/owned inboxes before requesting mail execution approval.
- [ ] For controlled stale authority/lost acknowledgement and runtime DB loss, write the affected process/request, trigger, containment, independent commit proof, abort and restoration method. If unavailable on the selected free service, record the missing capability and **blocked**; do not invent a hosted pass or fault switch.
- [ ] Save observed evidence through a PR. Independently approved earlier stages may proceed, but blocked R2/R3 prevent Task 7 and M5 closure.

**Acceptance:** P1 inventory is current for each imminent window; every method is executable under its approval or explicitly blocked with an owner/next decision.

## Task 2: Finish hosted verification, recovery and isolation (A1)

**Files:** Evidence/checkpoint files. **Consumes:** account/mail packet, human inbox/password input; [October 19 Task 3](2026-10-19-m5-completion.md#task-3-finish-accounts-verification-and-recovery-a1). **Produces:** separate C verification and A/B reset/revocation/isolation rows, actual send counts, unchanged progression baseline.

- [ ] Approve C disposition and the revised mail distribution before account creation or sending. Preserve existing A/B; never unverify them to manufacture a verification case.
- [ ] Execute the exact spec section 5 sequence: expire code 1 after real 10 minutes; send code 2, wait at least 60 seconds, supersede with 3; reject 2, accept 3 once, reject reuse. Count all sends and stay within the packet's limits.
- [ ] Keep pre-reset HTTP/socket sessions alive while the human resets in a separate context. Prove old-password/session rejection and socket revocation before signing out those probes; new login preserves the same account/progression.
- [ ] Verify C needs password sign-in after verification; verify sign-out/re-login and same-context A/B switching leave no previous wallet/collection/pending receipt/private room state visible.
- [ ] Record each subcheck and safe exit. Delivery, quota, revocation or progression mismatch fails A1 and enters Task 8.

**Acceptance:** Every A1 subcheck passes against the public Worker; a preverified A/B login alone does not pass native mailbox verification.

## Task 3: Verify hosted poker and earned tickets (G1/G2)

**Files:** Evidence/checkpoint files. **Consumes:** A1, two humans, current allowance and approved configuration; [October 19 Task 4](2026-10-19-m5-completion.md#task-4-verify-multiplayer-privacy-and-legitimate-rewards-g1g2). **Produces:** hand/chip/reward receipt rows and legitimate balances for Task 4.

- [ ] Recheck no unrelated participants, drain and apply only the approved economy configuration; read back artifact/flags and smoke before admitting the named accounts.
- [ ] Exercise room/host/controller/takeover/outsider boundaries, recipient-specific cards, real polling-to-WebSocket upgrade and authenticated reconnect. Keep private cards and frames out of retained evidence.
- [ ] Two humans complete at least two consecutive hands covering fold and showdown. Verify starting stacks plus all committed chips remain conserved (2,000 total under current two-player defaults), including uncalled returns.
- [ ] Compare qualification, net including blinds, UTC date and receipt deltas. Reach one ticket of remaining allowance then exhaustion on at least one account; participation takes priority. Wait another UTC day if needed; do not reset caps.
- [ ] Separately observe timeout-only and mixed-bot practice zero rewards. Run approved read-only `verifyEconomy(db)` from `scripts/verify-economy.mjs`; require `report.ok === true` and no unexplained source delta.
- [ ] End/drain, record balances and complete X1. Any chip/privacy/reward failure stops the flow and enters Task 8.

**Acceptance:** G1/G2 pass; each planned required pull is funded with five legitimately earned tickets.

## Task 4: Verify purchases, response recovery and equipment (G3)

**Files:** Evidence/checkpoint files. **Consumes:** G1/G2, approved human-run runner; [October 19 Task 5](2026-10-19-m5-completion.md#task-5-verify-collection-committed-response-recovery-and-equipment-g3). **Produces:** private committed purchase references and content baseline for restore.

- [ ] End/leave active play normally. Approve a bounded pull count: minimum two singles, one per A/B, five tickets each. A valid duplicate counts; do not reroll for rarity.
- [ ] Human runs the existing `node apps/web/scripts/operators/hosted-pull-recovery.mjs` from a prepared pinned checkout/interactive terminal for one planned single. Verify alias before arming with `WITHHOLD ONE 5-TICKET PULL RESPONSE`; human signs in and clicks once.
- [ ] Observe HTTP 201 commit and normal same-request recovery, one receipt/debit, unchanged result/pity. Retain unresolved browser/pending identity on uncertainty; inspect the original receipt before another purchase or context replacement.
- [ ] Verify rejected/insufficient pulls have no deltas, equip legitimately owned cosmetics and observe next-hand appearance in an explicitly started fresh session. Re-login preserves purchases/equipment.
- [ ] Corroborate source deltas/read-only economy audit; retain private receipt/password references for the later backup. Drain and complete X1.

**Acceptance:** Both A/B full loops and interrupted committed-response recovery pass; one missing subcheck keeps G3 open.

## Task 5: Exercise natural wake, reconnect and distinct fault variants (R1-R3)

**Files:** Evidence/checkpoint files. **Consumes:** approved methods from Task 1, purchased progression baseline; [October 19 Task 6](2026-10-19-m5-completion.md#task-6-verify-wake-reconnect-restart-and-approved-fault-methods-r1r3). **Produces:** distinct interruption outcomes and restored-controls evidence.

- [ ] Stop every tab/socket/probe for the actual provider idle interval, confirm natural sleep, then time first visit/authenticated recovery against 90 seconds. Test transient loss, unavailable versus 401, keyboard Retry and absence of mutation replay.
- [ ] In its approved window, restart during a known unfinished hand: interrupted session aborts, no aborted-hand reward, stale commands reject, fresh session requires explicit start.
- [ ] Separately restart after independently observed settlement commit: same receipts/rewards occur once and balances/inventory survive.
- [ ] Execute controlled overlap/lost-ack and runtime DB-failure cases only with Task 1's approved process-specific method and restoration. A same-config restart/startup DB failure cannot stand in for these cases. Otherwise retain **blocked**, local supporting evidence and the exact capability/decision needed.
- [ ] After each window drain, restore/read back original flags/triggers, smoke and audit. Uncertain integrity keeps affected writes closed; record X1 even when a gate fails.

**Acceptance:** R1/R2/R3 require all of their distinct variants. Unsupported variants remain explicit blockers to Task 7.

## Task 6: Certify a real encrypted recovery point (R4)

**Files:** Evidence/checkpoint files; operations docs only if the observed method changes. **Consumes:** Task 4 purchased-content baseline, operator key/storage, approved writer-stop/reopen packet; [October 19 Task 7](2026-10-19-m5-completion.md#task-7-implement-isolation-checks-and-verify-a-real-recovery-point-r4). **Produces:** certified archive/content/containment/auth/receipt/cleanup evidence and measured loss/recovery time.

- [ ] Select the reviewed merged executable candidate and its CI; build `node scripts/operations/build-restore-runner.mjs` from clean committed source before exposing real archive material. Reuse existing tooling and image provenance checks.
- [ ] Under separate live approval stop **every** source writer and automatic wake/deploy source. Obtain post-purchase encrypted dump/full manifest, source quiescence timestamp and read-only economy audit. Preserve the previous good archive; the October 17 archive cannot prove later A/B progression.
- [ ] Human runs `pwsh -NoProfile -File scripts/operations/Restore-PlaytestAccounts.ps1`, with existing masked prompts and exact restore phrase. No source URI/credential is accepted by this runner.
- [ ] Require actual network-none/tmpfs/auth containment before decryption, full manifest equality before app writes, normal restored A/B login and original receipt replay without another charge, unchanged durable progression and post-run egress checks.
- [ ] Require verified removal of both task containers. `CLEANUP_INCOMPLETE` or failed absence verification is failure, even if account checks passed; perform reported targeted recovery and verify absence before certification.
- [ ] Record archive checksum, content scope, loss window, elapsed incident-to-safe-reopen time against the one attended-day target and authorized source restoration/readback. Preserve encrypted artifacts outside Git.

**Acceptance:** Complete R4 and X1 pass with real post-progression content. A synthetic rehearsal or document-only restore is supporting evidence only.

## Task 7: Run six-person acceptance and close M5 (F1/X1)

**Files:** Evidence/checklist/checkpoint files. **Consumes:** all P1/A1/G1/G2/G3/R1/R2/R3/R4 pass; [October 19 Task 8](2026-10-19-m5-completion.md#task-8-run-six-person-acceptance-and-close-m5-f1x1). **Produces:** explicit M5 readiness decision and owned issue list.

- [ ] Confirm prerequisites, six distinct consenting humans, phone/desktop devices and new approved window/pull ceiling. Operator arranges invitations; do not substitute bots or automated clients for participants.
- [ ] Observe all seats and two consecutive hands, private-card isolation, responsive controls/timer/focus, reconnect and a legitimately earned group pull/equip/return loop. Record usability/economy feedback separately from defects; no tuning change without approval.
- [ ] Drain, restore/read back controls/triggers, smoke/audit and certify the post-session backup using the established procedure.
- [ ] Review every gate/subcheck and unresolved issue. Privacy/auth/economy/recovery/session blockers prevent M5 completion; nonblocking issues need owner and next action. Record operator acceptance of measured free-tier limits.

**Acceptance:** All M5 gates pass and exit is safe. Partial results never become release readiness.

## Task 8: Fix a reproduced defect when triggered

**Files:** Exact owning implementation/regression, plus evidence/checkpoints. For the known nonblocking portability issue only: `scripts/operations/provision.test.mjs`, optional sibling path regression, `scripts/operations/README.md`. **Consumes:** reproducible failure; **Produces:** focused reviewed fix and affected retest evidence.

- [ ] Record trigger, expected/actual invariant, stopped gate and sanitized evidence. For the known path minor, first reproduce the existing invalid-target CLI test in a disposable checkout path containing spaces; no hosted provisioning.
- [ ] Start a clean new defect branch from fresh `origin/dev`, read scoped instructions, add the minimal failing regression and run it red before editing implementation.
- [ ] For that path defect, use existing `fileURLToPath(new URL('./run.mjs', import.meta.url))` instead of `.pathname.replace(...)` in the test's CLI invocation. Assert exit 1, `TARGET_REJECTED`, and no private fixture marker from both ordinary and spaced paths. Broaden only if reproduction identifies another owner.
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm test:provision` for that defect, configured `pnpm check`, and affected real browser/socket tests when behavior warrants. Add `pnpm --filter @poker/web build:worker` when Worker code/config is affected. Test data stays disposable.
- [ ] Review full diff/whitespace, fetch, commit/push and PR to `dev`; user merges manually. Hosted defect correction needs separately approved redeploy and affected-gate rerun. Earlier valid evidence is preserved unless invalidated by the fix.

**Acceptance:** Failure reproduced then fixed with passing meaningful checks. The portability minor is optional and does not block use of the current space-free checkout.

## Task 9: Prepare private launch after M5; execute only when authorized (M6/M7)

**Files:** `docs/release-checklist.md`, `docs/deployment.md`, `docs/operations.md`, a dated release record under `docs/releases/`, mirrored checkpoints. **Consumes:** complete M5; [roadmap M6.1-M6.3/M7](2026-09-30-m3-through-production.md#m6--private-production-deployment-proposed-operational-phase). **Produces:** reviewable launch package, then separately authorized deployment/post-launch evidence.

- [ ] Prepare exact merged executable SHA/CI, Worker/backend immutable artifacts, compatible rollback, schema/catalogue, operators, named resources, measurements and cutover/stop steps. Production starts empty by default; reuse/import/delete of playtest progression requires explicit disposition approval before action.
- [ ] Resolve each launch field and present the concrete package for explicit authorization. Do not infer deployment permission from plan approval or a PR merge; do not add resources/billing or silently change free-tier acceptance.
- [ ] Only after authorization execute M6.2: drain/backup, reviewed migrations/catalogue, paired artifacts/health/one authority, designated human smoke/full loop, then approved invitations. Current global startup flags are not an account allowlist; require an attended no-unrelated-user window or separately designed admission control.
- [ ] On failure close affected writes, preserve committed progression and use compatible binary rollback; never automatically restore an old database over new rewards/purchases.
- [ ] Observe first group session and next return/sleep-wake, certify backup/economy/usage, record operator acceptance and issue owners. Adopt existing M7 operator cadence; create no scheduled automation unless requested.

**Acceptance:** M6 is complete only after actual authorized cutover and post-launch evidence. M5 completion alone does not pass M6.

## Verification and execution handoff

This plan/checkpoint change is documentation only: inspect full diff, verify local links and checkpoint mirror, run `git diff --check`; application tests are unnecessary. GitHub CI results above were read, not rerun. Review current exact-head checks for this documentation PR separately.

For every executable fix use Task 8's isolated red/green cycle and configured checks. For hosted evidence use the named packet and real observations; never run fixture suites against progression data. At each save point record branch/PR/last completed commit, pending work, actual checks, blockers, exact next command and usage/reset observations.

Self-review: all eleven M5 gates map to Tasks 1-7 and safe exits; Tasks 2/4/6 cover review-focus cases 2/3/5, Tasks 1/5 cases 1/4. Task 8 owns conditional code; Task 9 carries the separate M6/M7 handoff. No completed tool is scheduled for reimplementation, no blocked method is waived, and no new product architecture or economy value is proposed.

**First next action after plan review:** Task 1's current named read-only provider/account/mail preflight approval and inventory. Do not repeat A/B provisioning or start mail/game/deployment/backup actions from this planning request.
