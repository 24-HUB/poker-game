# Hosted Private Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline; do not delegate unless the user requests it.

**Goal:** Verify the existing hosting setup, establish a retained encrypted recovery point, complete a friends playtest, and prepare an explicitly authorized private launch.

**Architecture:** Keep the existing Cloudflare Worker/OpenNext frontend and fixed API/Socket.IO proxy, one authoritative NestJS service on Render, and MongoDB Atlas replica-set persistence. Use existing Brevo account-code delivery and operator-attended backup/recovery procedures. Reuse existing resources only after their environment and data are identified; playtest and production data/credentials stay separate unless the operator explicitly approves a transition.

**Tech Stack:** Existing Node 22.16.0, pnpm 10.33.0, Next.js/OpenNext, NestJS/Socket.IO, MongoDB official driver, MongoDB Database Tools, GitHub Actions, and the operator's selected encrypted backup destination. No dependency upgrades or new paid services are included.

**Spec:** [Consolidated design, sections 15–18](../../../plan.md), [M5.2–M7 release requirements](2026-09-30-m3-through-production.md), [deployment runbook](../../deployment.md), and [approved recovery targets](../../operations.md).

## Global constraints

- This is an execution plan for the accepted topology and release requirements, not a new application subsystem. The user requested this written plan; application implementation and live operations have not started in this task.
- The user confirmed on 2026-10-17 that hosting resources already exist. Their identities, current deployed revisions, data, and backup location have not been supplied. Inventory first; do not assume a blank database or provision replacements.
- Target $0/month within free allowances; paid upgrades require a separate decision.
- One active room initially; cosmetics never affect poker strength. Practice sessions with bots earn no tickets. Standard human sessions use the existing approved ticket policy.
- The user is the backup/incident operator. Retain seven latest successful session backups plus the latest pre-release backup until the next release is verified. Recovery point: at most progress since the last successful backup. Recovery time: within one operator-attended day.
- New tasks start clean, fetch origin, and branch from freshly fetched `origin/dev` before edits. Resume an existing task on its own branch/PR. Check usage at session boundaries and before substantial checks; below 10% in any window triggers a save-point assessment.
- Every repository change goes through a PR targeting `dev`; the user merges manually. No automatic merge/rebase or direct implementation on `dev`.
- Keep existing Render `autoDeployTrigger: checksPass` behavior. Before schema-dependent merges or coordinated maintenance, obtain authority to pause both Auto-Deploy and automatic Blueprint sync; record when to restore them. A repository PR is not authority to change live provider settings.
- Deployments, live migrations/catalogue publication, email sends, backups/restores and production changes require authorization naming the environment and actions. Request it only after the exact package is reviewable. Planning and local verification can proceed first.
- Never put credentials, raw backup manifests, session/code data, invite codes, personal addresses or private-card captures in Git or public evidence. Record secret names and restricted references only.
- Do not run the existing Playwright stack or synthetic database fixtures against hosted progression. Hosted acceptance uses designated real accounts and ordinary game-earned tickets; fixture tests remain isolated and local.

## Current evidence and gaps

Fresh `origin/dev` is `0d4ae28a`, the merge of PR #31. The local working directory was clean before creating `codex/hosted-release-plan`. The bot checkpoint records local Chromium 35/35 and prior aggregate/Worker evidence; those are historical results, not a new candidate verification or hosted result.

Authenticated GitHub inspection during planning confirmed the merged revision's [CI run](https://github.com/24-HUB/poker-game/actions/runs/38996688408) is completed with conclusion `success`. Recheck the selected revision and required job details at execution; this does not establish either provider's deployed SHA or hosted acceptance.

| Area | Observed repository state | Required next evidence |
| --- | --- | --- |
| Render | `dev`, Singapore Free, CI-triggered deploys; blueprint sets `ALLOW_NEW_SESSIONS=true`, `ECONOMY_WRITES_ENABLED=false` | Actual dashboard values, deployed SHA, current players/data and controlled maintenance scope |
| Worker | `apps/web/worker/index.ts`, generated OpenNext worker, `keep_vars: true` | Existing Worker identity, deployed version, fixed origins, secret-name inventory and compatible backend |
| Schema | Migrations 001–007 registered in `apps/server/src/database/migrate.ts` | Actual target versions; old backup text mentioning only versions 1–5 must be corrected |
| Email | Brevo six-digit verification/reset codes; migration 006 | Actual sender verification and designated-account delivery/revocation checks |
| Backup | Local encrypted isolated rehearsal and economy verifier exist | Retained external destination, recoverable key, all-writer shutdown method, hosted isolated restore |
| CI | Disposable MongoDB, migration replay, aggregate, backup drill, Linux Worker build, Chromium | Exact candidate run URL and successful required job; do not infer current CI from a merge |

## Review focus

1. Existing service contains progress: inventory and read-only inspection precede migration or disposal; preserve source data (Tasks 1, 3, 6).
2. Auto-deploy/Blueprint sync restarts a writer during a dump: prove all writers remain stopped and traffic cannot wake them; otherwise cancel backup (Tasks 2, 5).
3. Worker and server run different contracts after a merge: record compatible paired artifacts and test email codes, bot practice and human rewards through the public origin (Tasks 3, 4, 6).
4. Backup exists but key/metadata/restore is unusable: retrieve the retained archive and independently stored key; verify checksum, decryption, metadata and progression before release (Tasks 2, 5).
5. Cold start or lost acknowledgement causes duplicate charges/rewards: measure natural wake and interrupted operations; reconcile committed receipts without replaying mutations under fresh IDs (Tasks 4, 5).

## File ownership and deliverables

| Path | Responsibility |
| --- | --- |
| `docs/deployment.md` | Verified existing resource layout, configuration names, migration/deploy order and auto-deploy pause/resume procedure |
| `docs/operations.md` | Storage/key-access decision, accurate schema manifest, writer shutdown, retained archive/restore and incident evidence |
| `docs/release-checklist.md` | One dated candidate record and linked sanitized evidence for each acceptance gate |
| `docs/releases/2026-10-17-private-release.md` (create in Task 1) | Resource inventory, environment decision, candidate/rollback artifacts, authorization scope and execution results; use later execution dates within the record |
| `CHECKPOINT.md`, `plan.md` section 18 | Last completed step, branch/PR/commit, actual checks, blockers, usage and exact resume action |

Do not create a second checkpoint file. The release record is an evidence/approval package, not a replacement checkpoint. No executable change is required by this plan initially. If acceptance reveals a defect, reproduce it locally, add a meaningful failing test in the owning existing suite, implement the focused fix on its task branch, then rerun affected and required checks before selecting a replacement candidate.

### Task 1: Inventory the existing deployment and select the candidate

**Files:** Create `docs/releases/2026-10-17-private-release.md`; modify `docs/deployment.md`, `docs/release-checklist.md` and both existing checkpoints.

**Interfaces:** Consumes the merged `dev` revision and operator-provided non-secret resource references. Produces `Inventory` containing environment classification, Worker/version/public origin, Render service/region/deployed SHA/flags/auto-deploy state, Atlas cluster/database/schema versions, Brevo sender status, current progression status, candidate SHA/CI URL, paired rollback versions and unresolved operator decisions.

- [ ] Run status/branch, usage, and `git fetch origin --prune`. For a new execution task create `codex/hosted-release-inventory` from `origin/dev`; when resuming use its existing branch. Read this plan, checkpoints and current provider configuration before edits.
- [ ] Obtain existing resource references through authorized read-only dashboards/CLI. Record names/status only; do not print secret values or assume the configured blueprint matches the live service.
- [ ] Determine whether any accounts already have valued progression or active games. Classify each resource as disposable playtest or live private use. Unknown classification blocks mutation, not documentation work.
- [ ] Inspect exact merged-candidate GitHub CI. Require successful aggregate, migration replay, backup rehearsal, Worker packaging and full Chromium; record run URL/SHA. Fix failures on a focused PR before choosing that SHA. If existing green candidate CI covers unchanged code, avoid repeating full local suites solely for documentation.
- [ ] Correct runbook drift: admission is currently enabled in the blueprint, economy disabled, and runtime defaults closed only when production flags are absent. Schema manifest must derive versions from the candidate migration registry, currently 001–007. Preserve historical results as history.
- [ ] Record compatibility limits: pre-006 email-link artifacts are not a safe account-recovery rollback; bot/practice data must remain readable by any selected rollback. If no compatible older artifact exists, specify maintenance plus forward fix instead.
- [ ] Review diff and links, run `git diff --check`, commit only owned files, push the named task branch and create a PR with base `dev`. User merges manually. Exit: inventory is concrete and gaps have named operator actions; no hosted result is claimed.

### Task 2: Establish storage, key recovery and a feasible backup shutdown

**Files:** Modify `docs/operations.md`, the release record, `docs/release-checklist.md` and checkpoints.

**Interfaces:** Consumes `Inventory`. Produces `BackupDecision`: operator-approved external destination reference, available capacity/budget, encryption tool/format, independent recovery-key reference and access procedure, retention/disposal procedure, writer-stop/wake-prevention procedure, restore target isolation and separate scoped credentials. The private manifest contains archive checksum, timestamp, candidate/schema/catalogue/tool versions, counts and metadata; Git contains only a restricted reference and sanitized outcome.

- [ ] Ask the operator to select their existing storage or approve another destination. Compare existing encrypted removable storage with existing MFA-protected remote storage using actual capacity and access; do not select a paid product or enable billing. Verify space for retained encrypted archives and protected restore staging.
- [ ] Record the encryption format/tool and separately secured key access. A temporary key generated by `pnpm test:backup` is not a retained recovery key. Do not claim that test harness is a production backup CLI.
- [ ] Prove key retrieval and encryption/decryption on synthetic data, including wrong-key/tampered-archive rejection. Retrieve the encrypted sample from the selected destination, not only its local staging copy. Keep key material outside Git and separate from archives.
- [ ] Establish a provider-supported way to stop every backend/DB writer and prevent traffic-driven wake, automatic restart/deploy and Blueprint sync. Include auth, lease renewal, lazy wallet creation, jobs, migrations and catalogue publication. Maintenance flags alone are insufficient. If the Free service cannot be safely quiesced, block the hosted dump and resolve the operating method before proceeding.
- [ ] Verify the selected restore target is different, empty and isolated, using separate scoped credentials and blocked outbound email/production access. Record any shared Atlas quota impact before creating anything.
- [ ] Review storage/key/shutdown instructions and run `git diff --check`. Publish the task PR. Exit: the operator can recover a retained encrypted sample and has a concrete authorized shutdown/restore method; hosted data is still untouched.

### Task 3: Prepare and execute the authorized playtest deployment

**Files:** Modify the release record, `docs/deployment.md`, `docs/release-checklist.md` and checkpoints. Change `render.yaml` or `apps/web/wrangler.jsonc` only if inventory identifies a necessary reviewed configuration fix.

**Interfaces:** Consumes `Inventory`, `BackupDecision` and green candidate evidence. Produces `PlaytestDeployment`: explicit authorized resource/database targets, candidate SHA, applied schema versions, immutable catalogue hash, Worker/backend deployment IDs, effective control states and smoke results.

- [ ] Prepare an exact reviewable package: reuse/create decision, resource identifiers/regions/origins, database/data-preservation decision, candidate and rollback artifacts, secret names, sender, Atlas least-privilege/network rules, commands and interruption window. Recheck current provider limits and combined quota use. Request authorization for these named actions only after the package is complete.
- [ ] After authorization, pause Auto-Deploy and Blueprint sync for coordinated/schema work, drain games, close admission/purchases with a controlled restart, and take the approved backup if source progress exists. Confirm actual service settings; the repository blueprint currently enables admission. Do not silently change that user setting in this planning task.
- [ ] Configure authorized target secrets privately: exact `PUBLIC_ORIGIN`, fixed `BACKEND_ORIGIN`, matching `PROXY_SECRET`, DB URI/name, auth secret, registration-code digest and Brevo sender/key. Restrict Atlas network rules to approved service/operator egress. Never substitute unrestricted access or deploy memory-email/test-login settings.
- [ ] From the candidate checkout and operator migration context, explicitly set target `MONGODB_URI` and `MONGODB_DATABASE` privately. Run `pnpm db:migrate` twice, verify versions 001–007 for this candidate, then `pnpm --filter @poker/server catalogue:publish`; confirm identical replay and `celestial-v1` hash. The migration CLI has a database fallback: refuse to run until the explicit target is checked. Do not run in disposable CI using live credentials.
- [ ] Build with `pnpm install --frozen-lockfile` and `pnpm build:server`; build the Worker using `pnpm --filter @poker/web build:worker` on supported Linux or a verified packaging environment. Deploy the approved backend revision and matching Worker via their existing provider workflows. For an approved Wrangler upload from `apps/web`, use the pinned local CLI `pnpm exec wrangler deploy`; first confirm the selected account/Worker matches the package. These are real deployment actions, not verification commands to run before approval.
- [ ] Confirm `/health/deploy` and one authoritative readiness owner; set `PUBLIC_ORIGIN` privately and run `pnpm smoke:deployment`. Expected: exit 0, `shell: 200`, `readiness: ready`. The current smoke is bounded shell/readiness evidence only. A cold/standby failure remains a failure until the service is ready; do not treat it as full-flow acceptance.
- [ ] Record exact deploy IDs, effective settings and results. Exit: known paired artifacts are reachable on the authorized playtest origin, admission/economy remain closed except during explicitly authorized acceptance windows, and no live source was overwritten.

### Task 4: Verify hosted accounts, multiplayer and collection

**Files:** Modify the release record and `docs/release-checklist.md`; update checkpoints. No fixture/test-stack configuration changes for hosted access.

**Interfaces:** Consumes `PlaytestDeployment` and authority to use designated test accounts/send their email. Produces `HostedAcceptance` with timestamped sanitized pass/fail observations, designated-account references held privately and durable receipt evidence.

- [ ] Enable admission/economy only for the approved window via controlled backend settings/restart. Keep the registration invitation restricted to designated participants; there is no built-in per-account smoke allowlist. Do not assume one exists.
- [ ] Through the public Worker, register/verify using real six-digit Brevo codes, sign out/in and reset the password. Confirm account identity/progression survives, previous sessions/sockets are revoked, expired/resend codes behave correctly and old email-link acceptance stays retired. Do not send unsolicited mail or publish code/email data.
- [ ] Verify secure HTTP-only session cookies, uncached private responses, hostile Origin rejection, direct-backend denial without the proxy secret, and actual Socket.IO polling-to-WebSocket upgrade plus polling fallback. Check separate clients and forged IP headers cannot bypass proxy-trusted limits.
- [ ] Complete a standard two-human game, then one six-human session. Verify private cards per recipient, all-ins/side pots/chip conservation, host controls, invite rotation, takeover/reload and reconnect. Use manual authorized clients; never redirect the local seeded Playwright suite to this database.
- [ ] Earn ordinary tickets, inspect the daily allowance, pull at published prices, close/reload during a committed reveal, recover the same receipt without a second debit, equip both slots and confirm the next hand boundary and later sign-in preserve equipment. Keep any inspected receipt/account identifiers in restricted evidence.
- [ ] Complete solo and mixed bot practice: host-only roster changes before the session, practice label/history, no ticket/ledger awards, fair visible cards, thinking turns and disconnect pause/reconnect. Remove bots before a later standard session and confirm normal human rewards resume.
- [ ] Inspect phone and desktop layouts, action reachability, legal raise editing, result/history, keyboard focus and reduced motion. Record actual devices/viewports and sanitized outcomes. Exit: all flows pass or have a blocking defect and a focused fix/verification plan; no unchecked gate is marked verified.

### Task 5: Rehearse hosted interruption and retained-backup recovery

**Files:** Modify `docs/operations.md`, the release record, `docs/release-checklist.md` and checkpoints.

**Interfaces:** Consumes `BackupDecision`, `PlaytestDeployment`, `HostedAcceptance` and separately scoped drill authorization. Produces `RecoveryEvidence`: natural wake timing, restart/outage/fencing outcomes, retained encrypted backup reference/checksum, isolated restore metadata/economy/progression results, measured loss/time and reopening decision.

- [ ] Confirm authorization covers the exact playtest restart, DB-access interruption, deployment overlap and isolated restore targets. Do not induce outages on an environment with unapproved live players. Define stop conditions and compatible rollback before starting.
- [ ] Let Render sleep naturally with no app tabs/socket traffic, monitoring pings or keep-alive. Observe the next browser visit and bounded recovery. Record actual idle/wake/recovery times and limits, rather than assuming provider timing is an SLA.
- [ ] Restart during an unfinished hand and after a committed hand/pull. Verify interrupted hands abort without rewards; committed balances, receipts and cosmetics remain; retries resolve the original identity. Exercise temporary DB denial and overlapping replacement through authorized provider controls; one authority may mutate and stale owners must stop.
- [ ] Run the agreed full-writer quiescence procedure. Confirm auto-deploy/sync and incoming traffic cannot restart writers. Capture explicit source, schema 001–007, catalogue hash, MongoDB/Database Tools versions, quiescence time, full counts and validators/indexes in the private manifest.
- [ ] Follow `docs/operations.md` for read-only verification and a consistent dump without `--oplog`. Encrypt using the selected retained-key method, upload to the selected destination, verify checksum, and preserve the latest known-good archive on any failure. Do not put a real dump/key in repository artifacts or use `pnpm test:backup` against hosted data.
- [ ] Retrieve the retained archive and key through the recorded recovery procedure. Restore to the authorized empty different database with separate credentials and namespace mapping; no `--drop`, source overwrite, real-user notifications or migrations to mask missing metadata.
- [ ] Compare all metadata/counts, run the economy verifier with a read-only role and explicit `ECONOMY_VERIFY_MODE=operator-read-only`, verify designated test sign-in, receipt replay without new charges, ownership/equipment and one-authority startup. Keep outbound email blocked in restore isolation. Verify bot/practice records and zero practice rewards survive.
- [ ] Measure loss from the frozen recovery point and recovery duration through safe reopening; compare to approved targets. Record provider CPU/errors, backend memory/wake, Atlas connections/storage and email usage from the six-player acceptance. Restore approved service/access/auto-deploy settings after acceptance. Exit: recovery is measured on retained hosted evidence, or launch stays blocked with an exact next action.

### Task 6: Prepare and execute the private production cutover

**Files:** Modify the release record, `docs/deployment.md`, `docs/operations.md`, `docs/release-checklist.md` and checkpoints.

**Interfaces:** Consumes passing hosted/recovery evidence and the manually merged candidate. Produces `ProductionDecision`: exact production resource/data disposition, deploy/migration/backup actions, named operator/window, candidate/rollback compatibility, accepted limitations, and explicit authorization. Produces `ProductionRelease` only after execution succeeds.

- [ ] Fetch and record latest `origin/dev`; report drift without automatic integration. Select one green manually merged release SHA and pair immutable Worker/backend versions. Reverify code changes since playtest before promotion; documentation commits do not erase earlier evidence or prove new behavior.
- [ ] Prepare the final package with exact database/credentials/network isolation, secret-name inventory, artefact IDs, migrations/catalogue actions, controlled auto-deploy/sync pause/resume, backup and rollback/forward-fix procedure. Default to an empty separate production database and zero wallets. Reusing resources or retaining/deleting playtest progression requires an explicit disposition decision; never reset existing progress implicitly.
- [ ] Present measured limits and free-tier interruption behavior, remaining nonblocking issues and recovery targets. Request production authorization for the concrete package. A prior playtest authorization or PR merge does not authorize this cutover.
- [ ] After authorization, close admission/purchases, drain and resolve transactions, verify the required pre-release backup for any existing data, apply approved migrations/catalogue and deploy the compatible backend then Worker. Verify health/readiness, exact versions and public-origin read paths before opening play.
- [ ] Permit designated real smoke participants during the approved window; earn/pull/equip/re-login through ordinary gameplay. No production fixture accounts, synthetic balance updates or destructive suites. Open the agreed private group only after successful smoke and operator release decision.
- [ ] On failure, close admission/purchases and execute only the approved compatible binary rollback, preserving additive schema and committed progression. If compatibility is uncertain, stay in maintenance and prepare a forward fix. Restoring data requires separate incident approval and an explicit loss window.
- [ ] Record production evidence and the user release decision in the checklist/checkpoints. Exit: a verified private release with known limitations, or a preserved safe state and exact blocker; do not declare launch complete merely because deployment succeeded.

### Task 7: Complete the first session and operating handoff

**Files:** Modify `docs/operations.md`, the release record, `docs/release-checklist.md` and checkpoints.

**Interfaces:** Consumes `ProductionRelease`. Produces operator-owned session-backup, read-only audit, quota review and incident procedures with named follow-up actions.

- [ ] Observe the first full friends session and next return/sign-in, including a natural sleep/wake. Record phone/desktop feedback, earning pace, short-blind qualification and duplicate policy separately from bugs. No silent economy/catalogue tuning changes.
- [ ] Take the authorized post-session backup and verify its retained recovery reference; run the approved read-only economy check. Review provider usage and sanitized errors; stop wider invitations for critical defects or unexplained ledger/privacy/authorization failures.
- [ ] Record weekly quota/retention review and monthly or recovery-change restore rehearsal responsibilities, rollback artifact retention and incident contacts. No scheduled monitors or messages are created unless the user requests them.
- [ ] Obtain the operator's acceptance of remaining nonblocking issues and assign next actions. Publish documentation through its task PR, user merges manually. Exit: M5/M6 gates have actual evidence and M7 ownership is recorded.

## Verification and save points

For documentation-only steps: verify source paths, commands and links, review the entire task diff against `origin/dev`, and run `git diff --check`; application tests are unnecessary. For executable/configuration fixes: use pinned frozen installation, failing-then-passing focused coverage, `pnpm check`, affected real replica-set/Socket.IO tests, full `CI=true` Chromium and Linux Worker packaging. `pnpm test:backup` runs only its own isolated local replica set. No lint script currently exists.

At every task handoff, record only checks actually run, failures/unavailable access, branch/PR/last commit, resource decision references and exact next step in both existing checkpoints. Check usage before expensive verification and save before exhaustion. Fetch before handoff, report upstream drift, stage explicit owned files, push the explicit task branch, and open/update the PR targeting `dev`. The user merges manually. Missing provider access, backup decisions or live authorization block dependent operations while independent planning/local fixes continue.

## Plan self-review and immediate next step

Self-review mapped M5.2 storage/key completion to Task 2, M5.3 hosted deployment/full-flow/recovery to Tasks 3–5, M6 approval/cutover to Task 6 and M7 handoff to Task 7. All five review-focus conditions have concrete acceptance steps. Existing bot and email-code behavior is included; no completed feature is reimplemented. No provider resources, emails, hosted migrations or deployments were changed by writing this plan.

Next after plan review: execute Task 1 inline, confirming the existing resource inventory and exact merged-candidate CI. The operator's remaining storage/key choice can be collected during inventory; it does not block publishing this plan. Review this plan before execution.

## Provider references

Checked 2026-10-17; recheck at execution because quotas and capabilities can change:

- [Render Free limits](https://render.com/docs/free): idle spin-down, ephemeral filesystem, shared workspace allowance and operational restrictions.
- [Render deployment controls](https://render.com/docs/deploys): CI-triggered deploys, manual controls and coordinated rollout.
- [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/): actual plan/account quotas must be inspected.
- [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/): supported Database Tools and backup limitations.
