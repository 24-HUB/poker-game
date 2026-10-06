# Checkpoint — Remaining phases through production

## M5.1 CI/build slice save point - 2026-10-06 13:45 UTC

- Task branch `codex/m5-release-gates`, draft PR [#15](https://github.com/24-HUB/poker-game/pull/15), base `dev`. Created clean from `d0883bac` on 2026-10-03; resumed clean on 2026-10-06 with fetch and usage checks. Verified implementation commit `f6b2577a` is pushed. This documentation follow-up records the save point; the user merges manually.
- Completed: shared `pnpm build:server` builds contracts and poker-engine before Nest; Render and the uncached CI build gate use it. CI retains migration idempotency, aggregate checks and Worker packaging, then installs Chromium/system dependencies and runs the full browser suite. CI rejects `.only`, disables traces/video/automatic screenshots and uploads no media/raw reports. New release checklist distinguishes evidence from remaining release gates.
- Verification passed: frozen installs in the main checkout and fresh source export; old Render sequence reproduced missing poker-engine build errors, exact new command passed after removal of all backend `dist` directories. Two migrations against an isolated Docker replica-set database passed. Sequential `pnpm check` passed 169 server, 68 web, 15 contracts, 18 engine and three script tests, typechecks and production builds. Full Chromium under `CI=true` passed 14/14 in 1.4 minutes. YAML parsing and `git diff --check` passed. Independent read-only review found no actionable issue; manual test screenshots remain private ephemeral files, with no CI upload.
- Earlier aggregate failed at replica initialization while Docker's engine was unavailable. After the user opened Docker, both disposable services were healthy and the aggregate passed. No current local check failure remains. Browser harness listeners are stopped; Next type generation restored the production imports without unrelated generated-file changes. No deployment, live email, Atlas/catalogue mutation or dependency upgrade occurred.
- Fresh handoff fetch succeeded; latest `origin/dev` remains `d0883bac` and is contained in this branch. [Linux CI for implementation commit](https://github.com/24-HUB/poker-game/actions/runs/37473246386/job/112301934387) is in progress at this save point, so candidate Linux/Worker/browser results are not yet claimed. This docs follow-up will trigger another run; inspect the final PR head's checks before review/merge. Keep PR draft while required checks or the remaining M5.1 work are unresolved.
- Exact next implementation step: remain on this branch/PR; inspect status, usage, this save point and `plan.md`, then fetch. In M5.1, write failing real-replica/transport tests for concurrent starts in different rooms, retry-safe admission, blocked new purchases with unchanged balances, and committed receipt replay during maintenance; then implement validated server-only `ALLOW_NEW_SESSIONS` / `ECONOMY_WRITES_ENABLED` and one active session room under authority fencing. Expanded gameplay/visual acceptance, hosted playtest, live email and restore gates remain unchecked. Do not repeat the completed CI/build work.
- Usage observed 2026-10-06 13:42 UTC: five-hour 82% remaining (reset 2026-10-06 17:15:35 UTC), weekly 89% remaining (reset 2026-10-13 02:15:10 UTC). No reset credit used by this task. The previous below-10% observation is historical; the current windows permit further work after this bounded slice.

---

## README conflict resolution - 2026-10-02 14:29 UTC

- Continuing `codex/repository-readme`, PR [#14](https://github.com/24-HUB/poker-game/pull/14), base `dev`. Last completed README handoff commit before this resolution: `c665de83`; the merge commit containing this checkpoint records the resolution. The user requested conflict resolution after M4 PR [#13](https://github.com/24-HUB/poker-game/pull/13) merged into `dev` at `1054e977`; this explicitly authorizes synchronizing the existing task branch.
- Resolved integration of freshly fetched `origin/dev` into the README branch. Resolved the two documentation conflicts in `CHECKPOINT.md` and plan.md by retaining both the README history and all M4 verification/save-point entries. The README now reflects merged M0-M4, includes collection/pull/equipment status, and documents the local catalogue publication requirement. M5 and hosted/live email acceptance remain pending.
- Verification passed: ten local README links with exact case, pinned versions, eleven package scripts, harness catalogue setup, conflict-marker scan, Markdown fences and whitespace. Confirmed every original dev checkpoint entry, plan handoff and approved decision is preserved exactly. No unresolved files remain; the staged diff against `origin/dev` contains only the three Markdown files and all application files match dev. Reviewed the complete diff and `git diff --check` passed. Application tests were not rerun locally for this docs-only resolution; no deployment or live database operation occurred.
- Save-point next step: commit the staged merge, then `git push -u origin codex/repository-readme`. Fetch before final handoff, confirm the branch contains latest dev, and confirm GitHub reports PR #14 mergeable. After the push, review PR #14 and final-head CI before manual merge. No further implementation is pending; the user merges manually.
- Usage observed 2026-10-02 14:29 UTC: five-hour 86% remaining, reset 2026-10-02 19:02:07 UTC; weekly 9% remaining, reset 2026-10-06 01:38:22 UTC. Below-10% save-point trigger assessed: finish this bounded verified resolution and remote save; start no substantial new work. No reset credit used.

The dated handoffs below retain their original state and are historical.

---

## Historical repository README handoff - 2026-10-02 14:20 UTC

- Task: add the root README. Branch `codex/repository-readme` was created clean from freshly fetched `origin/dev` at `a3cb9794`, which includes merged M3. README commit `3aaf96ca` is pushed. PR [#14](https://github.com/24-HUB/poker-game/pull/14) targets `dev` and is open for review; the user merges manually. The follow-up documentation commit records this completed handoff.
- Added `README.md` with the product overview, actual workspace structure, pinned tooling, disposable MongoDB setup, PowerShell migration environment, frontend preview, complete loopback test harness, verification commands, configuration, and documentation links. M4 is correctly described as implemented in open PR [#13](https://github.com/24-HUB/poker-game/pull/13), pending merge; M5, hosted acceptance and live email delivery remain pending.
- Verification: all eight local README links exist with exact filename case; pinned versions, ten package scripts, harness path, Markdown fences and whitespace checks passed. Reviewed the complete task diff against `origin/dev`; `git diff --check` passed. Scope is documentation only; application checks were not rerun locally under the docs-only rule in `AGENTS.md`. No application behavior, provider setup, deployment or database operation changed.
- Freshness: handoff fetch succeeded and `origin/dev` remains `a3cb9794`, contained in the task branch. Only the three task-owned Markdown files changed. No local blocker or remaining README implementation work. Next action: review PR #14 and its final-head automated CI before manual merge; this handoff update triggers CI again. M4 review/merge stays in PR #13; M5 requires its own task and authorization gates.
- Usage observed 2026-10-02 14:20 UTC: five-hour 90% remaining, reset 2026-10-02 19:02:07 UTC; weekly 10% remaining, reset 2026-10-06 01:38:22 UTC. No reset credit used.

---

## M4 CI verification and review handoff - 2026-10-02 14:04 UTC

- Resumed the existing clean branch `codex/m4-cosmetic-collection` and draft PR [#13](https://github.com/24-HUB/poker-game/pull/13), base `dev`. Implementation commit `0b3ab8b3` and shutdown checkpoint `c89772ee` are pushed. No implementation work remains from the M4 save point; this follow-up records CI evidence and completes the handoff. The user merges manually.
- [Linux CI on saved head `c89772ee`](https://github.com/24-HUB/poker-game/actions/runs/36879381633/job/110426938910) passed. Every configured step succeeded: frozen pnpm install, disposable replica initialization, migration idempotency, `pnpm check` and Cloudflare Worker packaging. No PR review comments or submitted reviews were present at inspection.
- Existing local evidence remains valid: final server 169/169, web 68/68, contracts 15/15, engine 18/18, script tests, typechecks/production builds, full Chromium 14/14 and captured M4 flow 1/1. Fresh UI verdict **ship**, all six findings resolved, and scoped design record are complete. Only documentation changed during this resume; application checks were not needlessly repeated. Full task diff and `git diff --check` were reviewed.
- Fresh fetch succeeded; `origin/dev` remains `a3cb9794` and is contained in the task branch. No integration, deployment, live email delivery or live catalogue/database operation occurred. This documentation follow-up triggers another CI run; verify its latest head before manual merge. The PR can be marked ready after required checks pass.
- Next milestone after the user's manual M4 review/merge: M5.1 release controls and regression/CI preparation in `docs/superpowers/plans/2026-09-30-m3-through-production.md`. Start that new task with clean status, usage inspection and fetch, then create its branch from fresh `origin/dev`. M5 hosted playtest, live email and deployment remain separate authorization gates.
- Usage observed 2026-10-02 14:04:29 UTC: five-hour 98% remaining, reset 2026-10-02 19:02:07 UTC; weekly 11% remaining, reset 2026-10-06 01:38:22 UTC. No reset credit used.

---

## M4 shutdown save point - user requested stop - 2026-10-01 14:48 UTC

- Work stopped for the user to close the PC. Branch `codex/m4-cosmetic-collection`; draft PR [#13](https://github.com/24-HUB/poker-game/pull/13), base `dev`. Implementation commit `0b3ab8b3a621a4f8ad6b7010bc9094c018d4b633` is committed and pushed. This documentation save point follows it; no implementation changes remain pending locally. Leave the PR draft until Linux CI/Worker packaging and final review are inspected. The user merges manually.
- Last completed step: approved M4 collection/pull/equipment loop, twelve original celestial vectors, fresh UI review disposition **ship** (six findings resolved), and scoped design documentation. Frozen install, sequential aggregate (168 server/65 web/15 contracts/18 engine plus script tests, typechecks and production builds), later full server 169/169 and web 68/68, final typecheck/backend build, focused captured M4 Chromium 1/1 and full Chromium 14/14 passed. `git diff --check` passed. No lint script exists. Detailed behavior and earlier failed harness runs are recorded in the entry below.
- Fresh fetch at shutdown succeeded; `origin/dev` remains `a3cb9794` and is contained in the task branch. Only disposable Docker replica-set data was used. No deployment, live catalogue publication, production DB action or reset credit occurred.
- Remaining: inspect the final PR head's Linux CI, including migration idempotency and Cloudflare Worker build. CI status has not yet been inspected; local passing checks do not establish its result. No additional UI polish is pending. No tests/processes are still running for this task.
- Exact resume steps: check account usage; read this save point and plan.md; run `git status --short --branch`, `git branch --show-current`, then `git fetch origin --prune`. Continue this branch, do not recreate M4 or repeat passing checks without a new failure/change. Inspect [PR #13 checks](https://github.com/24-HUB/poker-game/pull/13/checks), fix any failure within M4, record CI evidence and mark ready only after required checks pass. Fetch before final handoff and report drift without merging/rebasing. M5 follows the user's manual M4 review/merge; deployment still needs separate authorization.
- Usage observed 2026-10-01 14:47:52 UTC: five-hour 51% remaining, reset 2026-10-01 18:27:23 UTC; weekly 12% remaining, reset 2026-10-06 01:38:22 UTC. No reset credit used.

---

## M4 local implementation verification - 2026-10-01 14:40 UTC

- Branch `codex/m4-cosmetic-collection`, created clean from freshly fetched `origin/dev` at `a3cb9794` after M3 PR #12 merged. All current changes belong to M4 and are pending the first task commit/PR targeting `dev`. Last completed base commit is `a3cb9794`. The user merges manually.
- User approved 5/50-ticket pulls, 70/25/5 R/SR/SSR odds, SR+10/SSR90 guarantees, unowned SSR exclusion until complete, no duplicate refunds, and twelve original celestial vectors plus free defaults. Each slot has three R, two SR and one SSR. Catalogue `celestial-v1` is explicitly published only in disposable tests; no live publication or deployment occurred.
- Implemented contracts/migration 005, immutable publication command and deterministic draws; atomic wallet/debit/ledger/ownership/pity/receipt transactions with account-scoped recovery; reload-safe pending request identity, committed reveal and collection UI; ownership/slot/revision-checked equipment, coherent collection reads and durable per-hand equipment snapshots. Custom backs never replace visible private card fronts. Assets and provenance are repository-authored.
- Verification: frozen install passed. Sequential `pnpm check` passed 168 server, 65 web, 15 contract and 18 engine tests, three script tests, typechecks and Nest/Next production builds. Later full server suite passed 169/169 including the competing collection snapshot regression; full web suite passed 68/68 including uncertain retries, stale-price review and account switching. Final workspace typecheck and backend build passed. No lint script exists.
- Chromium M4 flow passed 1/1: five earned tickets, storage denied without charge, interrupted committed POST/reload/same receipt, equip, next session visuals, card-front secrecy and sign out/in persistence. Mobile overflow, preview reachability/focus and keyboard tabs passed; reduced-motion/skip are unit-tested. The prior full browser attempt passed 13/14; its M4 failure was capture-clock hydration control, subsequently fixed with the focused pass. The full Chromium rerun passed 14/14. Fresh UI finish verdict is **ship**, with all six material findings resolved; the built M4 surface record is finalized. Six desktop/mobile purchase/collection/reveal captures are saved outside the repository.
- Earlier Docker checks were unavailable while its engine was stopped; after the user opened Docker, both disposable services and replica initialization succeeded. Earlier browser harness failures from actor-only controls, an ambiguous alert, transferred host control and premature login reads were corrected; none are claimed as passing runs. An initial aggregate test matcher type error was fixed before the passing aggregate.
- Next exact step: review/stage the final documentation, commit and `git push -u origin codex/m4-cosmetic-collection`; create its PR with base `dev`, attach it and inspect Linux CI/Worker packaging. Fetch origin before handoff; report drift without integration. Keep the PR draft while required checks remain unresolved.
- Usage observed 2026-10-01 14:40 UTC: five-hour 60% remaining, reset 2026-10-01 18:27:23 UTC; weekly 13% remaining, reset 2026-10-06 01:38:22 UTC. No reset credit used.

---

## M3 PR #12 review follow-up — 2026-09-30 12:26 UTC

- Branch `codex/m3-persistent-tickets`, existing PR https://github.com/24-HUB/poker-game/pull/12 to `dev`. Fix commit `727b1a71` is pushed; this documentation follow-up records its completed verification. Fresh `origin/dev` is still `7dd93e3e` and is contained in the branch. The user merges manually.
- Fixed the review's interrupted-password-reset finding: the pinned Better Auth endpoint now runs inside its adapter transaction context, so reset-token consumption, password update and prior-session deletion commit together. An aborted reset retains the previous password/sessions and permits retry with the same unexpired link. Added the matching pinned core dependency; no provider version upgrade or new configuration.
- Evidence: regression tests first reproduced partial password changes before the fix. Recovery integration now passes 12/12, including failures after password update, before/after session deletion, and simultaneous token use. Independent review found no actionable issues. Frozen install passed. Sequential aggregate (`$env:npm_config_workspace_concurrency = '1'; pnpm check`) passed 136 server, 56 web, 12 contract and 18 engine tests, three replica/deployment script tests, workspace typechecks and production builds. Mobile Chromium recovery passed 1/1. No lint script exists. `git diff --check` passed.
- The initial aggregate exposed the previously recorded authority child startup timeout; focused authority passed 8/8 and the sequential aggregate passed. The earlier typecheck failure from a test type import was corrected before these passing checks. Test fixtures used disposable local MongoDB; no live mail, deployment or production database operation occurred.
- [Linux CI on fix commit `727b1a71`](https://github.com/24-HUB/poker-game/actions/runs/36714901253/job/109885310270) passed, including migration idempotency, aggregate checks and Worker packaging. PR #12's description includes the fix and current verification. This documentation-only follow-up triggers another CI run; inspect the final head before manual merge. Next task after review/merge: fetch origin and start M4 from a clean `origin/dev`, resolving M4.1 proposals first. Live Brevo and hosted acceptance remain separately authorized M5 gates; M4 has not started.
- Usage observed 2026-09-30 12:26 UTC: five-hour 58% remaining, reset 2026-09-30 16:02:07 UTC; weekly 20% remaining, reset 2026-10-06 01:38:22 UTC. No reset credit used.

---

## M3 local implementation handoff — 2026-09-30 11:05 UTC

- Branch `codex/m3-persistent-tickets`, PR https://github.com/24-HUB/poker-game/pull/12 to `dev`. Code commit `6c3b9493` is pushed and [Linux CI](https://github.com/24-HUB/poker-game/actions/runs/36706649965/job/109858354540?pr=12) passed, including migrations, aggregate checks and Cloudflare Worker packaging. The follow-up commit records this evidence and repairs a Markdown heading. PR is being marked ready for code review. The user merges manually. Fresh `origin/dev` remains `7dd93e3e` and is contained in this branch.
- Implemented: verified email/password recovery through Brevo adapter, one-hour single-use reset and older-session revocation; existing accounts verify without changing ID/balance; policy v1 1 participation +1 positive net, manual action, 20 earned/UTC day; atomic wallets/ledger/daily/receipts in chip settlement; private API/events; real wallet and per-hand reward UI; focus/reconnect/midnight recovery and account cache clearing. No historical rewards. Test mail capture uses memory plus IPC, with a loopback harness endpoint only.
- Evidence: `pnpm check` passed 129 server, 56 web, 12 contracts, 18 engine tests, typechecks, replica init/deployment script tests and Nest/Next builds. Later focused settlement 15/15 and account recovery 8/8 passed. Wallet 4/4 includes consistent snapshot, privacy, revocation and midnight. Full Chromium 13/13 passed after review fixes; 360px recovery/wallet and desktop reward screenshots inspected. A prior concurrent aggregate failed a pre-existing authority process startup timeout; focused authority 8/8 and sequential aggregate passed. No lint script exists. No live provider mail or hosted acceptance ran.
- Final fresh-context review: fixed coherent wallet reads, server-disconnect authentication recovery, and client IP rate buckets; reviewer confirmed fixes. Additional redirect allowlist test exposed an external callback acceptance and now passes with explicit public-origin checks. Optional unsupported future policy rejection is deferred until another policy is introduced; current session creation only emits v1.
- Next task after manual review/merge: fetch origin, start a clean M4 branch from `origin/dev`, and resolve the catalogue/economy proposals in M4.1 before implementation. Live Brevo setup/delivery and hosted acceptance stay separately authorized M5 gates; M4 has not started. This documentation-only follow-up triggers another CI run; inspect it before merge.
- Usage observed 2026-09-30 11:05 UTC: five-hour 98% remaining, reset 2026-09-30 16:02:07 UTC; weekly 26% remaining, reset 2026-10-06 01:38:22 UTC. No reset credit used.

---


## M3 pause requested by user — 2026-09-30 06:50 UTC

- Task branch: `codex/m3-persistent-tickets`; draft PR: https://github.com/24-HUB/poker-game/pull/12 (base `dev`). Last completed remote commit before this save point: `84fd2831`. The changes described below are being saved as the next task-branch commit; no merge or deployment is authorized.
- Implemented locally since that commit: Better Auth email verification, password reset, session revocation and a test-only memory email adapter; recovery UI; versioned M3 reward policy; migration 004 for wallets, daily earnings, ledger and receipts; reward writes within the existing hand transaction; account-scoped wallet API and invalidation event; wallet and hand-reward UI. Reward receipts are filtered for each game-snapshot recipient. Existing unverified accounts must verify their email to regain access when deployed. Live Brevo delivery remains unconfigured and unproven.
- Verification: `pnpm check` passed after correcting two stale migration-count expectations: workspace typechecks, 116 server tests, 51 web tests, 12 contract tests, 18 poker-engine tests, and production Nest/Next builds. Focused recovery integration 5/5, wallet integration 1/1, settlement integration 6/6, poker integration 15/15, and migration integration 5/5 also passed. The earlier aggregate run failed on only those two stale expectations. M3 browser tests, account-event transport/revocation cases, full UI flows, Worker build and live Brevo delivery have not been verified. Keep PR #12 draft.
- Next exact action on resume: check usage; inspect `git status --short --branch` and branch; run `git fetch origin --prune` and stop if it fails. Update the Playwright account helper and `session.spec.ts` for verification, add isolated test mail capture for the browser recovery flow, then run focused and full Playwright suites. Add wallet event revocation/reconnect and UTC midnight cases, review the full M3 diff, and update this checkpoint before marking the PR ready. Do not merge or deploy.
- Usage observed 2026-09-30 06:50 UTC: five-hour window 57% remaining, resets 2026-09-30 11:01:45 UTC; weekly window 31% remaining, resets 2026-10-06 01:38:22 UTC. No reset credit was used.

---

## Active M3 implementation save point — 2026-09-30

- Branch: `codex/m3-persistent-tickets`, created from freshly fetched
  `origin/dev` at `7dd93e3e` after the user authorized removal of untracked
  `apps/`, `packages/`, and `node_modules/` from the stale local `dev` checkout.
- Scope: M3 persistent tickets only. The user confirmed 1 participation ticket,
  1 positive-net bonus, a manual-action requirement, a 20-ticket UTC daily cap,
  and participation-first cap allocation. The user selected email verification
  and password reset with Brevo Free using an address they control, without an
  owned sending domain. No provider account, secrets, deployment or production
  database work has been performed.
- Implemented so far: `RewardPolicy`, `RewardReceipt`, and `WalletView` schemas;
  a server-only Brevo email adapter that validates recipients and public-origin
  links, bounds provider calls, and hides provider error details. The adapter is
  not yet wired into Better Auth and no ticket is awarded yet.
- Verification actually run: `pnpm install --frozen-lockfile` passed; focused
  contract tests passed 2/2 after a failing schema run; focused adapter tests
  passed 2/2 after a failing no-send run; `pnpm check` passed, including
  workspace typechecks, 104 server tests, 48 web tests and production builds.
  The first aggregate run timed out in the pre-existing standalone MongoDB
  comparison because its disposable service was stopped. Starting that
  service made the focused test and full rerun pass. M3 browser tests and the
  Worker build have not run on this branch.
- Next step: resume M3.1 in `docs/superpowers/plans/2026-09-30-m3-through-production.md`.
  Write failing account-recovery integration tests against real Better Auth and
  the disposable replica set, then wire the email adapter, safe generic reset
  response, session revocation, sign-in/recovery UI, and local browser tests.
  Continue M3.2–M3.4 only after M3.1 is verified. Do not infer that this save
  point is a completed M3 milestone.
- Usage observation at 2026-09-30 03:06 UTC: five-hour window 7% remaining,
  resetting 2026-09-30 05:56:49 UTC; weekly window 39% remaining. No reset
  credit was used. Recheck both windows when resuming.

---

Updated: 2026-09-30. Freshly fetched `origin/dev` at `d3aa002b` contains merged
M2 PR #9. The documentation task branch is `codex/remaining-phase-plans`.
The next implementation milestone is **M3 persistent tickets**, beginning with
reward-policy and account-recovery decisions in M3.1 of the
[remaining-phase plan](docs/superpowers/plans/2026-09-30-m3-through-production.md).
That plan covers M3–M5 and proposed M6 production cutover/M7 operations, including
verification, deployment authorization, backup/restore and rollback gates.

This update changes documentation only; it does not implement tickets or deploy
services. Historical test evidence below is retained and was not rerun for this
planning task. M0–M2 hosted acceptance remains pending. All new plan execution
checkboxes remain open. The user merges the planning PR manually into `dev`.

## Historical M2 implementation handoff

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
