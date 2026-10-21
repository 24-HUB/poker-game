# Remaining M5 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute task-by-task, sequentially inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining friends-playtest acceptance and the operator tooling needed to observe it, preserving hosted progression.

**Architecture:** Keep the existing Worker/NestJS/Socket.IO/MongoDB system. Add isolated operator-only response-loss and restored-account runners, reuse the existing contracts/verifier, and fix product code only for a reproduced blocker. Use approved stage-specific live packets.

**Tech Stack:** Node 22.16.0, pnpm 10.33.0, existing TypeScript/JavaScript, Playwright, Docker, MongoDB Database Tools and operator-managed age.

**Spec:** [Remaining M5 completion](../specs/2026-10-19-m5-completion-design.md).

Status: **Local tooling implemented and PR #35 merged on 2026-10-21** as `a76e51da`.
The [post-merge forward plan](2026-10-21-post-merge-release.md) records successful
final-head/merged-dev CI and sequences the still-open work without repeating completed tools.
The detailed action contracts and historical checkboxes below retain their original scope.
Local implementation was approved through the user request to implement PR #35.
Implementation/evidence is in [PR #35](https://github.com/24-HUB/poker-game/pull/35)
and the [current execution record](../../releases/2026-10-19-m5-completion.md).
Live packets retain their separate approval requirements; M5 is not complete.

## Global constraints

- Node **22.16.0**, pnpm **10.33.0**, committed lockfile; no unrelated upgrades.
- Reward policy: participation **1**, positive-net bonus **1**, UTC daily cap **20**;
  single pull **5 tickets**; practice and timeout-only rewards **0**.
- Existing authenticated recovery bound **90 seconds**; email TTL **10 minutes**,
  resend cooldown at least **60 seconds**. Never mutate clocks, counters or balances.
- Proposed new mail packet: **12 total**, **4 each A/B/C**, nine planned plus one
  justified delivery retry per account; approval required before replacing the old packet.
- Arm phrase: `WITHHOLD ONE 5-TICKET PULL RESPONSE`. Real-archive phrase:
  `RESTORE ARCHIVE INTO ISOLATED LOCAL RUNNER`; both are prompt input, not commands.
- $0 hosting target, no source restore or public fault endpoints, no implicit
  privilege expansion, no fixture suites against hosted data, no agent-controlled
  hosted poker/pull clicks or alternate browser channel.
- Fresh fetch/usage/status on resume; new task branches from `origin/dev`, PRs to
  `dev`, task-owned staging only, user merges manually. No automatic integration.

## Review focus

1. Yesterday's clean A/B now has earnings or a UTC rollover: Task 1 refreshes the
   baseline; Task 4 waits a new day instead of seeding/resetting to reach a boundary.
2. A reset appears successful while an old socket still works: Task 3 preserves
   and checks pre-reset HTTP/socket sessions before signing them out.
3. A response is lost after commit or a runner exits: Tasks 2/5 recover the same
   receipt/request and prove one debit; never automatically start another pull.
4. A restart is mislabeled as DB failure or controlled overlap: Tasks 1/6 require
   a specific trigger/restoration/commit-proof method or retain blocked status.
5. A backup restores documents but leaks egress or lacks purchased progress:
   Task 7 validates containment/content before apps start and Task 8 rejects
   missing participants or substituted local evidence.

## Files, interfaces and task boundaries

| File | Responsibility |
| --- | --- |
| Create `docs/releases/2026-10-19-m5-completion.md` in Task 1 | Current execution packets, evidence IDs, gate register, findings and final decision. Preserve October 18 history. |
| Modify `docs/release-checklist.md`, `CHECKPOINT.md`, `plan.md` section 18 | Link current work and reconcile only observed results at each save point. |
| Create `apps/web/scripts/operators/pull-response-loss.mjs` | Shared, tightly scoped route/recovery protocol. |
| Create `apps/web/scripts/operators/hosted-pull-recovery.mjs` | Human-run headed CLI; fixed Worker, manual login/action, masked/sanitized output. |
| Create `apps/web/scripts/operators/pull-response-loss.test.mjs`; modify `apps/web/tests/e2e/collection.spec.ts` | Pure/CLI guards and reuse the shared protocol in the existing disposable full-flow rehearsal. |
| Modify `apps/web/package.json`, root `package.json` in Task 2 | Add/wire operator tests; no new dependency or lockfile upgrade. |
| Create `scripts/operations/Restore-PlaytestAccounts.ps1`, `restore-isolation.mjs`, `restore-account-check.mjs`, `restore-account-check.test.mjs`, `restore-runner.Dockerfile` in Task 7 | Masked operator orchestration, containment checks, copied-account browser checks and a prebuilt isolated image. |
| Modify `scripts/operations/README.md`, root `package.json` in Task 7 | Document the restore procedure and wire disposable isolation tests. |
| Conditional product/test files in Task 9 | Selected only from a concrete reproduced defect and its owning regression. |

No planned file above exists merely because this document names it. Read the
applicable `AGENTS.md` before changing each directory; web changes also require
the bundled Next.js guidance when framework code is implicated.

Common output is an evidence row with the exact fields in spec section 8.
Subsequent tasks consume rows and approved packets, not raw secrets or unstated
assumptions. Gate acceptance criteria are defined once in spec section 5.

## Task 1: Refresh candidate and prepare executable packets (P1)

**Files:** Current execution record and common evidence files above.
**Consumes:** merged `dev`, historical October 18 evidence, existing provider access.
**Produces:** candidate/compatibility inventory, refreshed A/B baseline and five
named stage packets; explicit method records for unresolved fault checks.

- [x] Inspect clean status/current branch, fetch, usage and current checkpoints.
  Record latest merged SHA and its complete CI result; the known `4f1e0e9b` CI
  success is historical if dev has advanced. Do not redeploy a documentation SHA.
- [ ] Read backend/Worker artifact/configuration IDs, flags, triggers, rollback
  compatibility and public origin. Confirm expired temporary access without
  deleting game accounts or silently recreating credentials.
- [ ] Re-run the projected A/B Atlas baseline using existing permitted access:
  balance/revision, current UTC earnings/allowance, owned/equipment/receipts/progress,
  active memberships and current schema/catalogue/authority. Record authorized
  deltas from October 18; preserve private mappings outside Git.
- [ ] Privately compare the deployed sender with Brevo's verified sender and
  dashboard headroom. Check current primary limits at execution. Prepare C/native
  verification and the revised 12-send packet as **proposals requiring approval**.
- [ ] Prepare gameplay, fault, backup and friends packets with exact service IDs,
  candidate, operator/window, effects, stop/restore steps and current controls.
  Read the control boundaries in spec section 3; confirm no unrelated players.
- [ ] For each DB-failure/overlap/lost-ack method, record the exact process/request,
  trigger, containment, independent commit proof and restoration. Check it against
  actual free-tier controls. Unsupported means blocked; never use a public test
  endpoint, shared Atlas interruption or a local test as substitute hosted proof.
- [ ] Record which stages have all prerequisites and retained authorization;
  obtain only missing named approvals. Planning/PR merge alone is not a live packet.
- [ ] Review diff/links/whitespace, commit only evidence files, push the explicit
  task branch and open/update its PR to `dev`. Save the exact next executable step.

**Exit:** every imminent stage has a concrete packet and its needed approval;
later unsupported gates remain visible and prevent F1/readiness.

## Task 2: Implement/rehearse the operator pull-response runner (G3 method)

**Files:** Pull-runner files, package scripts and collection rehearsal in the table.
**Consumes:** approved written tool design, existing `pullReceiptSchema`, current
`POST /api/pulls` -> HTTP 201 contract and the disposable collection flow.
**Produces:** `validateTarget(origin, mode): URL` and
`runPullResponseLoss(page, options): Promise<LossReport>` from `pull-response-loss.mjs`.

`options` has `origin`, `mode: 'hosted'|'fixture'`, `expectedDisplayName` and typed
`confirmation`. `LossReport` has only `result: 'pass'|'blocked'|'fail'`, `committed`,
`sameReceipt`, `singleDebit` and fixed mismatch categories. IDs/receipts stay in
memory. Fixture mode accepts only `http://127.0.0.1:3100`; the CLI hardcodes hosted
mode, the exact Worker and Playtest A/B names. It exposes no fixture-mode argument.
Use `mismatches: string[]` limited to `TARGET_REJECTED`, `IDENTITY_MISMATCH`,
`UNCONFIRMED_COMMIT`, `REJECTED_PURCHASE`, `RECEIPT_MISMATCH`, `UNEXPECTED_DEBIT`
and `UNEXPECTED_POST`; never embed a driver/browser error in a category.

- [x] Write failing Node tests: `rejects unknown/credential-bearing targets and
  missing confirmation before browser launch`; `CLI rejects credential arguments`;
  `report redacts receipt, account and session identifiers`. Assert explicit
  rejection/no launch and absence of synthetic secret markers, not source text.
- [x] Run `pnpm --filter @poker/web exec node --test scripts/operators/pull-response-loss.test.mjs`;
  observe the intended failures before implementing guards/CLI.
- [x] Implement the two exports and headed CLI under the contract above. Disable
  recordings/state files; human login and pull click only. Arm one exact POST,
  forward once (`maxRedirects: 0`, `maxRetries: 0`), hold a validated committed 201,
  reload the same page, release/unroute and compare normal receipt recovery plus
  one five-ticket debit. Never clear an unresolved request or retry a new ID.
- [x] Refactor only the existing interrupted-pull portion of
  `collection.spec.ts` to call the shared protocol. Add named assertions for
  `commit then reload recovers same receipt with one debit` and
  `unestablished commit stops without an automatic second mutation`.
  Keep all fixture bootstrapping local; no fixture helper import in the hosted CLI.
- [x] Run the Node tests and
  `pnpm --filter @poker/web exec playwright test collection.spec.ts --project=chromium`.
  Observe green on disposable services; capture no credential snapshots.
- [x] Add web `test:operator` and root `test:operator`, and include the latter in
  root `test`. Run the common executable verification below and review the diff.
- [x] Commit/push the tested tool on its own task branch/PR. Keep live use blocked
  until manual merge, compatible candidate evidence, approved operator-owned
  execution method and the gameplay packet. This is not an agent API bypass.

## Task 3: Finish accounts, verification and recovery (A1)

**Files:** Current execution record/common evidence only unless Task 9 is triggered.
**Regression references:** `apps/server/test/{email-codes,account-recovery,identity}.e2e-spec.ts`,
`apps/web/tests/e2e/{account-recovery,session}.spec.ts` (brace notation lists existing files).
**Consumes:** fresh P1 account/mail packet and unchanged A/B progression baseline.
**Produces:** per-account verification/reset/session-isolation evidence and actual send counts.

- [ ] Confirm operator-owned inboxes and current sender/quota, C disposition and
  approval of the revised mail distribution. Do not repurpose a personal account,
  unverify A/B or create C without its named approval/human credential entry.
- [ ] Preserve A/B contexts and pre-reset authenticated HTTP/socket connections.
  Stage each reset in a separate context; if capacity requires it, finish A,
  then establish B's pre-reset session and test B. Never lose the revocation probe
  by signing it out first. Use a waiting-room socket if needed; no poker hands.
- [ ] Execute C verification and A/B recovery using the exact three-send sequence
  in spec section 5. Wait real expiry/cooldown; new passwords/codes are entered
  and submitted by the human. Stop on delivery, quota, ownership or target mismatch.
- [ ] Verify C creates no session until password sign-in. For A/B, check old
  password rejection, old HTTP session rejection and old Socket.IO disconnection/
  command rejection, then new-password login and unchanged account/progression.
- [ ] Test sign-out/re-login and A/B switching in one context: previous wallet,
  collection, pending pull and room/private state cannot leak into the new account.
  Unavailability alone must not erase authenticated/pending state or imply logout.
- [ ] Compare source/UI baselines, record actual sends (maximums apply across
  retries), retain separate verification and recovery evidence and save via PR.
  Any incomplete subcheck keeps A1 open; do not re-run completed A/B creation.

## Task 4: Verify multiplayer, privacy and legitimate rewards (G1/G2)

**Files:** Evidence record/common files. **References:** server
`{rooms,poker,poker-gateway,gateway,wallet,settlement,bots}.e2e-spec.ts`; web
`{rooms,poker,active-room,bots}.spec.ts` in the existing test directories.
**Consumes:** A1, approved gameplay/economy packet, two humans and fresh allowance.
**Produces:** per-hand chip/reward observations and balances funding Task 5.

- [ ] Recheck candidate/flags/unrelated participants. Drain, pause only approved
  automatic updates, apply the approved economy-enabled configuration deployment
  and read back its artifact/settings. Recheck smoke/accounts before new play.
- [ ] A creates a room, B joins normally. Verify seats/host restrictions,
  observer/outsider authorization, per-recipient cards, explicit controller
  takeover and stale-tab rejection. Observe polling-to-WebSocket upgrade and
  authenticated reconnect/refresh; never dump live private cards or socket frames.
- [ ] Two humans finish at least two consecutive hands with fold and showdown
  evidence. Check stacks plus committed chips against the starting total and
  uncalled-bet returns; do not force rare outcomes or edit hosted state.
- [ ] Record dealt-in/manual-action qualification, contribution/payout/net,
  completion UTC date and expected/actual policy-v1 receipt deltas each hand.
  Earn to one remaining ticket and then exhaustion on at least one account;
  verify participation-first boundary and no increase after cap. If unavailable,
  retain the check and wait another UTC day without provisioning replacements.
- [ ] Observe timeout-only zero rewards and a separate mixed-bot practice session
  with zero human rewards. End/drain it separately; practice cannot fund pulls.
- [ ] Corroborate receipts and run `verifyEconomy(db)` with approved read-only
  scope. Preserve any mismatch, stop the affected flow and enter Task 9.
  Save evidence and current balances; each required Task 5 pull needs five tickets.

## Task 5: Verify collection, committed-response recovery and equipment (G3)

**Files:** Evidence/common files. **References:** Task 2 tool; server
`gacha.e2e-spec.ts`, `equipment.e2e-spec.ts`; web `collection.spec.ts`.
**Consumes:** G1/G2, earned balances, approved operator-run response-loss method.
**Produces:** account-owned receipts/ownership/equipment baseline for backup.

- [ ] End/leave normal gameplay before collection. For A/B, inspect the current
  balance/banner, perform approved human single-pull clicks and corroborate each
  five-ticket debit, receipt, result/pity and ownership or honest duplicate.
- [ ] Use the Task 2 human-run CLI for one planned pull (it may be A's required
  single), only after explicit approval of that headed browser method. Human
  authenticates/acts; the runner withholds the committed response and observes
  same-request recovery. Compare one debit/receipt and unchanged replay result.
  Any uncertain commit stops; inspect the original receipt before further writes.
- [ ] Check insufficient/blocked pull invariants and sign-out/in persistence.
  Equip a legitimately owned item, explicitly start a fresh session and observe
  next-hand equipment. Never bypass active-room navigation or seed inventory.
- [ ] Run the read-only economy verifier and source delta comparisons. Record
  receipt/content references privately for the recovery point; end/drain play.
  Preserve a duplicate result and choose an already owned item rather than rerolling
  solely to manufacture a new cosmetic.

## Task 6: Verify wake, reconnect, restart and approved fault methods (R1–R3)

**Files:** Evidence/common files; no production fault-switch code.
**References:** server `{authority,database,poker-recovery,settlement}.e2e-spec.ts`,
web `backend-recovery.spec.ts` and existing provider operations.
**Consumes:** passed progression checks, packet-specific methods/approval and baseline.
**Produces:** separate evidence for each interruption and restored controls (X1).

- [ ] Close tabs/sockets and stop all probes for the currently documented idle
  interval. Confirm provider sleep, then time the first visit and authenticated
  recovery against 90 seconds. Verify terminal keyboard Retry, transient network
  loss, unavailable versus 401 and no mutation replay. Do not probe during idle.
- [ ] Recheck unrelated participants and each approved trigger. Run the named
  unfinished-hand restart: no aborted-hand rewards, stale commands rejected,
  honest interruption UI and explicit fresh-session start.
- [ ] Separately observe a committed settlement, then the approved post-settlement
  restart. Receipts/rewards appear exactly once and inventory/balances persist.
  Perform any lost-ack/old-authority variant only when Task 1 supplied its exact
  controlled method and independent commit proof.
- [ ] Execute R3 only with an approved process-scoped runtime DB fault and proven
  restoration. If no safe existing free-tier mechanism exists, record blocked
  with its missing capability and retain local regression evidence separately.
  A startup connection failure or ordinary restart does not pass R3/overlap.
- [ ] Drain, restore/read back the pre-window flags/triggers, run smoke and the
  economy audit. Keep affected writes closed if integrity is uncertain. Save
  each failed/blocked/pass result without silently waiving a prerequisite.

## Task 7: Implement isolation checks and verify a real recovery point (R4)

**Files:** Restore files/package wiring listed above; current evidence/common files.
**Consumes:** written restore-tool design, Task 5 content baseline, operations
procedure, approved source-writer shutdown and encrypted-storage/key references.
**Produces:** `verifyRestoreIsolation(inspect): IsolationResult` and
`checkRestoredAccounts(input): Promise<RestoreReport>`; an archive-specific R4 row.

`IsolationResult` contains only `ok: boolean` and `violations: string[]` from a
fixed allowlist: `NETWORK_MODE`, `PUBLISHED_PORT`, `HOST_MOUNT`, `SOURCE_CONFIG`,
`DEFAULT_ROUTE`, `EGRESS_ALLOWED`. Inspect actual Docker settings plus in-namespace
route/connectivity probes before returning this result. `input` is read from stdin and has `origin` fixed to
`http://127.0.0.1:3100`, `database` matching `^poker_test_restore_[a-f0-9]{32}$`,
and `accounts` containing exactly two `{alias: 'A'|'B', email: string,
password: string, requestIds: string[]}` entries. Private receipt IDs select the
backed-up receipts; expected durable values come from the authenticated archive
manifest, not fresh source reads. Input never reaches logs/args/files. `RestoreReport`
has `ok: boolean`, `accounts: {alias, signedIn, receiptReplayUnchanged,
progressionUnchanged}[]`, `violations: string[]` and `elapsedMs: number`.
Violations are fixed `ISOLATION_FAILED`, `CONTENT_MISSING`, `AUTH_FAILED`,
`RECEIPT_MISMATCH`, `PROGRESSION_MISMATCH` or `ECONOMY_MISMATCH`. Raw identities,
receipts, keys and passwords stay private.

- [x] Write failing disposable tests: `rejects host/default-route/source-secret
  mounts before restore`; `rejects non-loopback or non-restore DB targets`;
  `restored real auth/receipt replay preserves durable values with egress denied`;
  `missing A/B purchase content cannot pass R4`. Test actual Docker containment
  and replica-set/auth behavior, not only mocked inspection objects.
- [x] Run `node --test scripts/operations/restore-account-check.test.mjs` against
  generated local data; observe the intended failures before implementing tools.
- [x] Implement the two exports, PowerShell 7 masked wrapper and prebuilt image
  under spec section 6. Reuse `verifyEconomy(db)` and existing auth/receipt contracts;
  no fixture account helper, default source URI or new live email transport.
- [x] Rehearse image preparation, network-none Mongo/shared namespace runner,
  loopback app/browser, failed external access and all process exit checks with
  generated encrypted fixtures. Add root `test:restore-accounts` and include it in
  root `test`; run it, `pnpm test:backup` and common executable verification.
- [ ] Review/merge the tooling PR before selecting a real archive. Confirm the
  retained archive's account/purchase content. Use the approved post-progression
  backup procedure when the October 17 archive is insufficient; do not repeat
  migrations, credential rotation or restore onto the source.
- [ ] Under the separately approved backup packet, stop every source writer and
  automatic wake/deploy source, resolve uncertain receipts, audit, then stream
  dump -> age with every process exit checked. Keep the result provisional until
  checksum, key access and isolated restore/manifest comparison pass. No plaintext
  dump on unverified D: storage and no paid backup subscription.
- [ ] Validate real restore containment before decrypting, compare manifests
  before app startup/target-only migration, then human supplies backed-up A/B
  passwords privately. Verify login, same receipt replay without extra charge,
  balance/ownership/equipment/economy. Record expected local auth/lease deltas
  separately. Do not mount source credentials or publish ports.
- [ ] Record archive/quiescence time, loss window and elapsed local safe-reopen
  decision against one operator-attended day. Certify only the actual archive;
  preserve the last known-good backup on failure. Restore/read back source controls
  through the approved reopening procedure and save evidence/PR.

## Task 8: Run six-person acceptance and close M5 (F1/X1)

**Files:** Evidence/common files; operator-facing joining/checklist notes in the record.
**Consumes:** passed P1–R4, current candidate, six humans/devices and a new approved window.
**Produces:** complete gate register and explicit friends-playtest readiness decision.

- [ ] Confirm all prerequisites pass; unresolved DB/overlap/response-loss/restore
  methods block this acceptance session. The user arranges consent/invitations;
  the agent sends no messages to friends and does not fill seats with fixtures/bots.
- [ ] Before admission, apply the approved economy configuration after drain and
  verify artifact/settings/smoke. Six distinct humans occupy six seats and finish
  at least two consecutive hands, representing phone and desktop browsers.
- [ ] Observe own-card privacy, legal controls/timer, touch/keyboard/focus, safe
  areas/keyboard obstruction and reduced motion. A designated participant
  reconnects without duplicated action or private-card leak. Record actual device
  classes/count only; a two-account rehearsal is not F1 evidence.
- [ ] Corroborate group reward and one legitimately earned pull/equip/return loop,
  saved sign-in progression and user feedback. Keep economy-tuning suggestions
  separate from defects; do not change policy during acceptance.
- [ ] Drain, restore/read back the original controls/triggers, smoke/audit and
  certify the post-session backup under retention rules. Keep a failure blocker
  instead of reopening questionable writes or deleting the last good archive.
- [ ] Review every P1–X1 row and open defect; no blocked/not-run item counts as
  pass. Record operator acceptance of free-tier limits and friends-only decision.
  Save checkpoints, fetch, review diff/status, push PR to dev; user merges manually.

## Task 9: Reproduce and fix an observed blocker (conditional interrupt)

**Files:** Exact existing implementation and nearest regression selected from the
failed gate's references, recorded in a bounded defect note before edits.
**Consumes:** sanitized failing observation/candidate; **produces:** failing-first
regression, minimal reviewed fix and affected local/hosted retest evidence.

- [ ] Record impact, reproducible trigger, actual/expected invariant, stopped
  gate, owner and private evidence reference. A missing prerequisite is blocked,
  not a product bug; do not add speculative product changes for it.
- [ ] Track the known provisioning-test URL/path-with-spaces portability minor
  under this task with an owner/next action. Reproduce it in a disposable checkout
  path containing spaces before a targeted fix; it does not block friends play
  when the operator uses the already verified space-free checkout.
- [ ] Start clean, fetch and create a new defect branch from origin/dev. Read
  applicable instructions. Write one meaningful failing regression and observe red.
- [ ] Implement the smallest correction using existing contracts/authority and
  atomic/idempotent persistence. Run the focused regression green, then the common
  executable verification and affected real Socket.IO/Playwright flows.
- [ ] Review full diff, fetch, commit only owned changes, push and create a PR to
  dev. User merges; then establish merged-candidate CI, obtain the named redeploy
  approval, rebaseline and rerun affected hosted gates/final smoke before resuming.

## Common executable verification and handoff

These existing commands apply to code changes, with disposable local databases:

```powershell
pnpm install --frozen-lockfile
docker compose up -d mongodb mongodb-standalone
pnpm db:init
pnpm check
pnpm test:backup
pnpm --filter @poker/web exec playwright test --project=chromium
```

Inspect Linux CI for `pnpm --filter @poker/web build:worker` and all configured
steps; no lint script currently exists. New operator/restore test scripts become
available only after their owning tasks add them. Never replace local fixture
URIs/baseURL with hosted values. Hosted runs use only the approved operator path.

For evidence/documentation-only tasks, review accuracy, links, the complete task
diff, mirrored checkpoints and `git diff --check`; no app suite is needed. On each
save point capture actual checks, candidate/branch/PR, pending work, blocker and
exact next step, with usage remaining/reset times. Fetch before handoff and report
upstream drift without merging/rebasing. Live gates remain distinct from PR status.

## Self-review and coverage

| Spec requirement | Owner |
| --- | --- |
| Completed evidence/freshness, controls, authorization and expiry | Task 1; common constraints/handoff |
| Proposed C/mail budget; code/session/cache correctness | Task 3 |
| Human poker/privacy/transport; rewards/cap/practice | Task 4 |
| Earned pulls, response loss, equipment/persistence | Tasks 2 and 5 |
| Natural wake/network/restart/DB/fencing; safe exit | Task 6 |
| Image containment, encrypted content-sufficient backup, restored accounts | Task 7 |
| Six humans/mobile/accessibility/final readiness/retention | Task 8 |
| Reproduced failures, regression/fix/redeploy/retest | Task 9 |

Self-review: every gate and five review-focus conditions has an owner; tool
exports/report names match across tasks; current commands/test paths were checked.
Proposed files and future scripts are labeled. Unsupported hosted fault methods
remain explicit blockers, not undefined implementation promises. This plan does
not waive them or claim new acceptance evidence.
