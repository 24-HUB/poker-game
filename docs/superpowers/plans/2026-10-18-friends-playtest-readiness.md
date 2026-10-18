# Friends Playtest Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, sequentially inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the existing public game supports the approved friends playtest while preserving all hosted progression, fixing observed blockers through reviewed PRs.

**Architecture:** Retain the Worker proxy, authoritative NestJS/Socket.IO server and MongoDB replica set. Separate disposable regressions from operator-driven hosted acceptance; existing fixture suites must never target hosted resources. No new product subsystem is proposed.

**Tech Stack:** Node 22.16.0, pnpm 10.33.0, Next.js, NestJS, Socket.IO, MongoDB, Playwright, Jest and Vitest, using the committed lockfile.

**Spec:** [Friends playtest readiness](../specs/2026-10-18-friends-playtest-readiness-design.md).

Status: written spec approved by the user's 2026-10-18 request to implement PR #34. This plan awaits review; inline execution is retained from the spec. No new hosted gate has passed.

## Global constraints

- Preserve every existing hosted account, ticket, receipt and cosmetic; no delete, reseed or reset.
- Use two dedicated operator-controlled inboxes, aliases A/B in Git; retain mappings and credentials privately.
- Require two-account hosted acceptance and six distinct humans, including phone and desktop browsers.
- Production launch, balance changes, paid resources, automatic monitoring and messages to friends are excluded.
- Existing flags are startup configuration, not a database freeze or dedicated-account allowlist. Economy disabled still permits standard-hand ticket rewards.
- Obtain approval of the concrete live package before email sends, deployments, flag changes, backup or deliberate interruptions. Plan approval authorizes preparation only.
- Retain PR #34 for this planning task, base `dev`; user merges manually. New defect tasks start clean from freshly fetched `origin/dev` and get their own PRs to `dev`.
- Recheck usage and fetch on resumption; preserve existing checkpoints. No automatic upstream merge/rebase.

## Review focus

1. Saved flags differ from running process flags: Task 1 requires deployment identity and read-back, Task 4 verifies restoration.
2. Reused A/B account reaches its UTC cap or receives a duplicate: Task 3 preserves progression, waits another UTC day if necessary and verifies the receipt without demanding new ownership.
3. Lost acknowledgement represents a committed mutation: Tasks 3–4 distinguish receipt replay from an aborted hand; never issue a replacement identity to hide uncertainty.
4. Backup exists but lacks the tested accounts/purchases: Task 4 checks content and schema before restored-account acceptance.
5. Fixture/browser evidence masquerades as six human participants: Task 5 records actual attendance/devices; missing people leaves F1 pending.

## Files and evidence interface

- Create `docs/releases/2026-10-18-friends-playtest.md` during Task 1: sanitized execution package, gate register, findings and final decision. Preserve the older release record as historical evidence.
- Update `docs/release-checklist.md`: link the current record and reconcile only gates supported by observations.
- Update existing `CHECKPOINT.md` and `plan.md` section 18 at each save point.
- Product/test files change only for a reproduced blocker; Task 6 specifies how to select them.

Each evidence row has `id`, `gate`, `candidate`, `environment`, Bangkok timestamp, operator alias, preconditions, action, expected invariant, actual observation, `pass|fail|blocked|not run`, sanitized private evidence reference and next action. Gate IDs are P1, A1, G1, G2, G3, R1, R2, R3, R4, F1 and X1. Initialize every gate as **not run**. Historical CI/maintenance evidence keeps its original scope and date.

### Task 1: Prepare a reviewable live execution package (P1)

**Files:** Create the release record above; modify release checklist and existing checkpoints.
**Consumes:** spec, [maintenance exit](../../releases/2026-10-17-private-release.md), [operations](../../operations.md), candidate Git/CI and read-only provider observations.
**Produces:** named actions, prerequisites, restoration controls and approval record consumed by Tasks 2–5.

- [ ] Check clean status/current task branch, usage, fresh origin fetch and the save point. Inspect candidate diff and CI inputs; record merged candidate SHA separately from this documentation PR head.
- [ ] Read provider dashboards without revealing secrets. Record backend SHA/deployment ID, Worker binary/configuration version, public origin, database/schema/catalogue version, current flags, automatic-update settings and compatible rollback artifacts. Resolve drift before proceeding; do not deploy merely to align documentation commits.
- [ ] Inspect exact-candidate CI: frozen install, `pnpm check`, `pnpm test:backup`, Linux Worker build and full Chromium job. Reuse only with unchanged relevant inputs and an explicit compatibility comparison. A new application fix needs its own candidate evidence.
- [ ] Privately confirm operator, A/B inbox ownership, existing account/verification state, verified Brevo sender and current quota. Consult current official provider limits at execution. Do not send mail during inventory. Missing access/quota is a blocker, not authority to provision replacements.
- [ ] Record proposed mail budget **at most six messages per account, twelve total**: up to two verification sends (prior-code invalidation/latest success) and four recovery sends (expiry, bounded resend, successful reset). Reused verified accounts omit verification only with matching evidence. If existing expiry/cooldown behavior cannot fit this budget, stop and revise the package before sending more. Record purposes, order, actual count and provider headroom; never raise the budget implicitly.
- [ ] Privately baseline A/B balance, UTC allowance/date, items, equipment and receipt inventory using separately authorized read-only database access. Verify account mapping remains outside Git. Identify active test versus unrelated memberships before each deployment.
- [ ] For every proposed action, fill exact resource/candidate IDs, operator/window, precondition, expected data effects, stop condition and restoration. Include each configuration deployment, mid-hand restart, post-settlement restart, database fault, authority overlap and isolated restore. An unavailable safe fault method marks that gate blocked; do not invent targets or run it.
- [ ] Prepare response-loss method: only A/B's browser response is dropped after single-pull submission; retain the existing pending request ID and corroborate commit via account-owned receipt. Validate the method on loopback first. Browser request blocking before submission cannot establish a lost committed response.
- [ ] Assess retained backup age/content and key access; do not repeat completed migrations or rotation. Name the separately approved post-Task-3 backup, source writer shutdown and isolated restore boundary required for R4.
- [ ] Review the completed package with the operator and obtain explicit approval for its named live actions. Until exact targets/window/methods are filled and approved, keep P1 incomplete and do not start dependent hosted actions.
- [ ] Review diff/links, run `git diff --check`, commit only the record/checklist/checkpoints, push the task branch and update its PR to `dev`. Record approved actions separately from missing prerequisites.

### Task 2: Verify both hosted account lifecycles (A1)

**Files:** Update release record, checklist and checkpoints only unless Task 6 is needed.
**Local regression references:** `apps/server/test/account-recovery.e2e-spec.ts`, `apps/server/test/email-codes.e2e-spec.ts`, `apps/server/test/identity.e2e-spec.ts`, `apps/web/tests/e2e/account-recovery.spec.ts`.
**Consumes:** approved P1 package and private A/B baseline. **Produces:** per-account lifecycle evidence and intact progression baseline for Task 3.

- [ ] Use separate ordinary browser contexts through the public Worker; disable traces, recordings and failure-page dumps around credentials/codes. Register only absent dedicated accounts. Verification must not create a session; password login requires verified email.
- [ ] Within approved send budget, check malformed/wrong code, actual expiry, bounded resend invalidating the prior code, latest-code success and reused-code rejection. Wait real expiry; never change hosted clocks/challenges/rate counters. Stop on delivery/quota failure.
- [ ] For each account, sign in, reload, sign out and recover password. Check same account/progression, old-password rejection and revocation of a pre-reset HTTP session and Socket.IO client; log in again with the new password.
- [ ] Switch A/B in one browser and check wallet, collection and private room state clear correctly. Compare pre-existing progression against the private baseline; explain authorized additions separately.
- [ ] Record actual sends, observations and remaining prerequisites. A configured sender or one working account does not pass A1. If a blocker appears, stop the affected flow and follow Task 6.

### Task 3: Verify gameplay, rewards and collection (G1–G3)

**Files:** Update release record/checklist/checkpoints.
**Local regression references:** `apps/server/test/{poker-gateway,settlement,wallet,gacha,equipment,bots,release-controls}.e2e-spec.ts`; `apps/web/tests/e2e/{release,collection,active-room,bots}.spec.ts` (brace notation lists existing files).
**Consumes:** A1 and approved economy-enabled window. **Produces:** hand/reward/pull invariants and content requirements for the recovery point.

- [ ] Recheck no unrelated players, drain test play, pause only approved automatic updates and apply economy-enabled configuration using the reviewed deployment method. Record new artifact/configuration identity and smoke/account recheck. Do not assume a session survives the deployment.
- [ ] A creates a room and B joins by code. Verify seats, host/controller restrictions, old-tab takeover rejection and outsider/observer privacy using only approved accounts. Observe actual polling-to-WebSocket upgrade, refresh and authenticated reconnect.
- [ ] Complete at least two consecutive human-only hands, observing fold and showdown results/history. Check per-recipient private cards and stack-plus-committed-chip total against initial 2,000 chips, including returned uncalled bets. Do not force rare outcomes by hosted data edits.
- [ ] For each completed hand, record UTC completion date, manual-action qualification, contributions/payout/net, expected/actual participation and bonus. Earn legitimately to the 20-ticket cap on at least one account: verify the one-remaining-ticket participation-first boundary and no increase after exhaustion. Timeout-only earns zero. If current allowance prevents a scenario, wait another UTC day and retain the pending gate.
- [ ] End/leave via normal navigation to collection. Each account earns enough for one 5-ticket single pull. Check one debit/receipt/result/pity change, ownership or honest duplicate, and persistence after sign-out/in. Check blocked/insufficient pull leaves balance/pity/ownership unchanged.
- [ ] Execute the loopback-validated response-loss method once using the original pending request ID. Recover/replay the same receipt; verify exactly one charge and unchanged replay result/pity. Rejoin/history refresh must not duplicate rewards. If commit cannot be established safely, record blocked.
- [ ] Equip an owned item, explicitly start a fresh session and observe equipment at the next hand boundary. Never bypass the active-room navigation lock. Run a separate mixed-bot practice session and verify no human earns tickets there.
- [ ] Run approved database-scoped read-only corroboration using `verifyEconomy(db)` from `scripts/verify-economy.mjs` and private receipt comparisons; it must report consistency without identifier output or repairs. End/drain play; retain before/after baseline and backup-content requirements privately.

### Task 4: Verify interruptions and restored accounts (R1–R4, X1)

**Files:** Update release record/checklist/checkpoints; reference `docs/operations.md` without weakening its shutdown/isolation procedure.
**Local regression references:** `apps/server/test/{authority,database,poker-recovery,settlement,account-recovery}.e2e-spec.ts`, `apps/web/tests/e2e/backend-recovery.spec.ts`, `scripts/rehearse-backup.test.mjs`.
**Consumes:** exact approved drill methods, Task 3 receipt baseline and content-sufficient recovery point. **Produces:** per-drill recovery evidence and safe control restoration.

- [ ] Close test sockets/tabs and stop probes for the currently documented Render idle period. Confirm provider sleep, then measure first-visit wake and authenticated recovery. Also test transient browser network loss. Verify the original 90-second recovery bound, terminal keyboard Retry, no mutation replay, and 401 versus unavailable behavior. Timeout alone is not proof of sleep.
- [ ] Before each approved disruptive action, recheck candidate/flags and unrelated memberships. Run the specifically approved mid-unfinished-hand restart: no reward for that aborted hand, stale commands rejected, honest interruption state and explicit new-session start.
- [ ] Separately restart after confirmed settlement, including the approved lost-ack variant. Verify the committed result/reward appears exactly once and prior balances/receipts/equipment survive.
- [ ] Run database-unavailable and overlapping-authority drills only with the reviewed scoped methods. Verify unavailable is not logout, no partial/duplicate commit, fenced old authority and safe restoration. If a method/access remains unavailable, R2/R3 stays blocked; isolated tests do not satisfy a hosted gate.
- [ ] Inspect retained archive metadata/content before selecting it. The 2026-10-17 pre-006/007 archive with zero purchases/equipment cannot establish later A/B progress. Obtain separate approval for the required consistent post-game backup; stop all source writers using the operations procedure, stream encrypted data and compare isolated restore with its manifest before application start.
- [ ] Use an isolated loopback app/browser with fresh local secrets, blocked mail/provider/source-DB egress, no reused hosted cookies and automatic jobs disabled. Approve the exact isolation/startup arrangement first. Apply any required migrations to the restore target only after manifest comparison and record transformations separately. Verify A/B login via their backed-up password credentials, session behavior, receipt replay, balance, ownership/equipment and economy against that archive. No synthetic account/progression edits or live email.
- [ ] Measure archive age/loss window and elapsed time to local safe-reopen decision: loss bounded by progress since last successful backup; target one operator-attended day. Do not label this source restoration or proven incident recovery time.
- [ ] Restore the observed pre-window flags/automatic-update settings through the approved procedure after draining, read them back, record artifact IDs and run public smoke plus approved economy audit. If integrity is uncertain, keep affected writes closed, retain evidence and report the recovery blocker.

### Task 5: Run the real friends session and decide readiness (F1, X1)

**Files:** Update release record/checklist/checkpoints with final gate register and open issues.
**Consumes:** passed prerequisite gates, operator-arranged attendance and approved friends window. **Produces:** friends-playtest-only decision; no production authorization.

- [ ] Give the operator public origin and brief joining instructions privately where invite codes are involved. The operator invites friends and records participant consent/progression effects; send no messages to others.
- [ ] Before admitting friends, apply the approved economy configuration/deployment and validate smoke. Six distinct humans must occupy all six seats in one standard session and finish two consecutive hands. Record actual count, phone/desktop browser classes and candidate/time without personal identifiers. Missing attendees/devices leaves F1 pending.
- [ ] Observe own cards, legal controls/timer, safe-area/keyboard layout, touch/keyboard/focus and reduced motion. A designated participant reconnects with no private-card leak or duplicated action. Do not ask friends to perform destructive/security-negative drills.
- [ ] Corroborate qualifying rewards and one legitimately earned pull/equip/return loop in the group, using normal end/leave/navigation and fresh-session flow. Verify saved progression after sign-in again; record pacing/forced-blind/duplicate feedback separately from defects.
- [ ] End/drain all play before restoring controls. Perform X1 read-back/smoke/audit and post-session backup under the retention procedure and named approval, or record the blocker. No flag redeploy during friends play.
- [ ] Require every gate P1–X1 to pass and no open blocking defect; record minor issues with owner/next action and explicit operator acceptance of free-tier limitations. Otherwise report exact pending gates. Do not claim friends readiness or production launch from partial results.
- [ ] Fetch origin before handoff, report task ancestry without merging/rebasing, review complete diff/status/whitespace, commit/push task-owned evidence and update its PR to `dev`. User merges manually.

### Task 6: Correct a reproduced blocker (conditional, interrupts Tasks 2–5)

**Files:** Select the implicated existing module and the nearest regression file listed in its owning task; record exact paths in a bounded defect plan before editing. Do not preemptively rewrite working subsystems.
**Consumes:** sanitized failing observation. **Produces:** focused fixing PR and affected local/hosted retest evidence.

- [ ] Record severity, reproduction, impact, owner and stopped gates; preserve uncertain committed outcomes. Reproduce on loopback disposable data with explicit clocks/randomness where needed.
- [ ] Start clean, fetch, create `codex/<defect>` from current `origin/dev`; never stash unrelated work or branch around a dirty directory. Add the specific failing assertion in the owning suite and run it to establish failure before fixing.
- [ ] Implement the smallest correction preserving server authority, private projections and atomic/idempotent progression. Run the focused regression and inspect a pass; keep random rare scenarios isolated.
- [ ] Verify Node/pnpm pins, `pnpm install --frozen-lockfile`, isolated MongoDB services (`docker compose up -d mongodb mongodb-standalone`, then `pnpm db:init`), `pnpm check` and affected real Socket.IO/browser flows. Playwright uses its existing loopback stack: `pnpm --filter @poker/web exec playwright test --project=chromium` (append relevant filenames for focused checks). Use Linux CI for `pnpm --filter @poker/web build:worker`. No lint script exists. Never substitute hosted database variables.
- [ ] Review complete task diff/whitespace/status, fetch, commit only owned changes, push explicit task branch and open a fixing PR to `dev`. Failing/unavailable required checks leave it draft. Record actual command results, fixing SHA and remaining blocker; user merges manually.
- [ ] After manual merge, re-establish exact merged-candidate CI and artifact compatibility. Obtain approval for the named redeploy, rerun affected hosted gates and final smoke. Only then close the defect and resume its interrupted task.

## Plan review and next action

Self-review: all five spec stages and eleven gates have owning tasks; the five review-focus cases have explicit checks. Existing test paths and commands were inspected; local suites are regression references, not evidence of new passes. No speculative executable change is required before an observed defect.

Next: operator reviews this written plan, then Task 1 prepares and reviews the concrete package. Exact live IDs, private inboxes, window and safe fault/restore methods are deliberately execution prerequisites; their absence blocks dependent actions rather than permitting guessed targets. Preserve sequential inline execution.
