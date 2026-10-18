# Checkpoint — Remaining phases through production

## Friends playtest readiness specification — 2026-10-18

- Spec/plan, Package A and the exact temporary-access package approved. User
  requested NEW A/B accounts using two + aliases, then direct database creation
  without verification email. Supersedes existing-account/registration handoffs.
- Branch `codex/friends-playtest-spec`, draft PR #34 targeting `dev`; last completed
  helper commit `b5f4e87a`. Fresh `origin/dev` `fe654481` included (0 behind).
  Current follow-up adds safe wrapper diagnostics and single-Node resolution;
  no app deployment or agent source database operation.
- Applied custom role `playtestAccountProvisioner20261018`: find+insert only on
  `poker_playtest.user` and `.account`; no wildcard/inherited roles. Applied one
  six-hour current-IP rule, comment `friends-playtest-provisioning-20261018`.
  Corrected the shortcut's initial nonexpiring rule by replacing only that new
  entry; existing three rules untouched. IP expiry around 2026-10-19 02:31 Bangkok.
- Operator created `poker_provisioner_20261018` privately. User row verifies SCRAM,
  exact custom role, one cluster (Cluster0 selected in setup), six-hour countdown.
  No password/URI loaded by agent. Operator attempt stopped at ArgumentList
  before Node launched or a database write. A later generic helper failure has
  unknown apply mode. The initial “already create” report was then clarified
  as dry-run planned after B login mismatch.
  Following the explicit -Apply handoff, operator now confirms status created.
  No auth reset/fix or duplicate apply. Agent independently verified normal
  A/B login, reload persistence and UI baselines at 21:08–21:10 Bangkok.
- Reviewed helper `scripts/operations/` uses masked PowerShell 7 prompts,
  stdin-only secrets, default dry run, exact apply phrase, pinned Atlas host
  `cluster0.lxb4kqs.mongodb.net` / database `poker_playtest`, pinned Better Auth
  hashing and one transaction for two new preverified user/credential pairs.
  Refuses existing aliases; no ticket/cosmetic/session grants or deployed auth
  change. Normal login initializes zero wallets. Personal progression preserved.
- Checks previously passed: frozen install; `pnpm check` 533 tests, typechecks and
  configured builds; final `pnpm test:provision` 2/2 after reproduced RED validator
  fix; Node/PowerShell syntax. Independent review: no Critical, Important fixed.
  Remaining minor: helper test path cannot handle spaces. PowerShell version
  guard corrected after the operator reported the 5.1 null ArgumentList error.
  Linux CI run 39098342866 on `32e12ad5` completed/success, verify steps passed.
  Follow-up verification completed 20:48 Bangkok: frozen install, typecheck,
  full pnpm test (534 passed; provisioning 3/3), production builds, PowerShell 7
  syntax and diff check passed. Disposable local MongoDB only; new-head CI pending.
- Latest local verification 20:57 Bangkok: frozen install and pnpm check passed
  (535 tests, provisioning 4/4, typechecks/builds); PowerShell 7 syntax/diff passed.
  Helper-head CI b5f4e87a run 39133807763 rechecked 21:07 Bangkok: completed/
  success. Subsequent documentation heads are not covered by that result.
- Fresh public smoke: Worker shell HTTP 200/readiness ready. Chrome access recovery
  resolved to Sign in after its Lobby was brought into view; no timed wake gate.
- Hosted setup verified in separate Chrome A / in-app B contexts: Playtest A/B,
  0 tickets, 20 daily allowance, Alice avatar / Club default card back equipped,
  all six nondefault avatars and six card backs Not owned. Reload retained each
  identity, balance and collection. No pulls, equips, game or economy action.
  Local sanitized proofs: player-a-verified-baseline.jpg / player-b-verified-baseline.jpg.
  Both sessions remain signed in and tabs preserved for continuation.
- Read-only source baseline 21:17–21:18 Bangkok through existing Atlas Data Explorer
  (no new access): exactly A/B, verified true by override, one zero/revision-0 wallet
  each, earned 0 for UTC 2026-10-18; ownership/equipment/pull/reward/ledger/progress
  and memberships all zero. Catalogue celestial-v1/hash recorded, migrations 1–7,
  global active participants/memberships 0, one live authority lease/epoch 34.
  No full economy or validator/index certification claim. Sanitized result/query/
  screenshot source-account-baseline files retained outside Git; no IDs/emails/
  credentials/private cards/session/challenge data. Audit tab preserved.
- Exact next step: resume remaining P1/A1 prerequisites in the execution record:
  current sender/quota and provider inventory evidence, then approved email
  recovery/sign-out/switch/revocation checks with operator
  password/code handoff. Preverified accounts do not pass mailbox verification.
  Do not repeat provisioning/reset/adopt accounts. Do not start Package B until
  exact methods/prerequisites and its separate live-action approval are resolved.
  Temporary access must expire as configured; recheck expiry on later resumption.
- New A/B setup and read-only baseline complete; P1/A1 mailbox and later gameplay,
  outage/restore/friends gates remain pending or blocked. Execution record:
  `docs/releases/2026-10-18-friends-playtest.md`; helper instructions:
  `scripts/operations/README.md`. PR stays draft; user merges manually.
- Usage observed 2026-10-18 about 21:20 Bangkok: five-hour 41%, weekly 78%
  remaining; resets 2026-10-19 01:25:56 and 2026-10-25 07:52:38 Bangkok.
  Resume with status/current branch, usage, fresh origin fetch and this entry.

## Hosted release execution — 2026-10-17

- **20:25 Bangkok maintenance complete**, branch `codex/hosted-release-inventory`,
  draft [PR #33](https://github.com/24-HUB/poker-game/pull/33), prior commit `64917e9a`.
  Operator submitted the new shared credential privately. Worker type Secret,
  encrypted value, version `e4cfba62-ffca-4f1e-9864-eda43f85f3a0`, Ready/100%.
  Resume alone kept previous Render config: initial smoke timeout/403; deploying
  saved environment on same SHA fixed it (`dep-db9nchks728c73cb28jg`, 40.7 s).
  An initial post-deploy 503 settled; public shell/readiness passed. Original settings
  restored via final same-SHA deploy `dep-db9ndnss728c73cb5p40`, Live/40.8 s:
  admission true, economy false, Render after-CI deploys, Blueprint sync Yes,
  Worker Git builds enabled. All persisted controls read back; final public smoke
  passed shell 200/readiness ready. **Backend online; do not follow the historical
  20:12 keep-suspended instruction below.** Final reader audit 20:25:49 confirms
  001–007, six exact validators, three required indexes, unchanged progression,
  economy OK, one live authority, zero active participants/memberships. Backup and
  encrypted evidence retained unchanged on D:. Temporary accounts expire naturally.
  No application source changes or full hosted-flow claim. Next: prepare scoped
  designated-account/email/game/interruption acceptance and sender/quota evidence;
  follow required separate authorization before those live actions. PR stays draft
  for remaining release gates; user merges manually. Usage 20:25:32 Bangkok:
  five-hour 50%, weekly 46% remaining; resets 2026-10-18 00:49:02 and
  2026-10-22 13:13:35 Bangkok. Final evidence diff reviewed; working/task whitespace
  checks and 40 relative file links passed. No app suite rerun for documentation.

- **20:12 Bangkok live maintenance save point** on `codex/hosted-release-inventory`,
  draft [PR #33](https://github.com/24-HUB/poker-game/pull/33); prior commit `ce4d1494`.
  Operator saved both temporary credentials; scoped reader/migrator connectivity
  and roles pass. All automatic updates paused: Render Off, Blueprint No, Worker
  Disable builds checked. Admission/economy false; corrected restart
  `dep-db9n4j3ncjis739v0m60` on `0d4ae28a` then service suspended, HTTP 503 suspension
  page verified. Initial masked admission edit retained true; caught and corrected.
  Source had zero active participants/memberships. **Keep service suspended.**
  Encrypted backup at `D:\PokerBackups\archives\2026-10-17T13-06-06-061Z-poker-playtest-provisional.archive.gz.age`,
  13,484 bytes, SHA256 `f73726109ade7bbbbb2d9387e7eb20b8b2e7642cb329a81a823e3ddf6fb757aa`.
  All 25 collections unchanged across capture; economy passed. Isolated tmpfs/
  network-none restore matched metadata/counts/fingerprints/economy, 5,453 ms.
  Windows/Linux index-list locale ordering caused initial false mismatch; private
  comparator fixed to code-point sort, preserving compound-key order. Containers
  cleaned; encrypted manifests and certification retained; filename remains provisional.
  Both `pnpm db:migrate` runs exit 0. Reader verifies 001–007, six candidate-exact
  validators, three required indexes and unchanged durable progression/economy.
  **Pending operator:** run private `Copy-NewProxySecret-20261017.ps1`, paste new
  shared secret into Render prepared environment form (Save only), Cloudflare
  prepared Secret form (Deploy), reply “both saved”. Helper syntax checked, not run.
  Browser approval review rejected revealing old Render secret as unnecessary;
  no bypass. Human entry/submission handoff retained both tabs. Then record new
  Worker config version, resume same SHA closed, verify public smoke/progression,
  restore admission true/economy false and original automatic updates. Do not
  roll back schema, restore source or reopen with mismatched secrets.
  Usage before migrations: five-hour 74%, weekly 50% remaining; reset times below.
  No hosted full-flow/email/game/interruption acceptance or release approval yet.

- **19:54–19:58 Bangkok credential handoff**: operator reports reader created;
  Atlas confirms `poker_release_reader_20261017`, `read@poker_playtest`, six-hour
  expiry and one-cluster restriction (Cluster0 selected in prepared form).
  Prepared an unsubmitted migrator form with `readWrite` + `dbAdmin` only on
  `poker_playtest`, Cluster0 only, six-hour expiry. Operator must enter/submit its
  password. Prepared syntax-checked `Save-ReleaseCredentials-20261017.ps1` in
  the private profile key directory: masked secure prompts, DPAPI-protected
  PSCredential CLIXML files, refuses overwriting saved credentials. Directory ACL
  remains current user/SYSTEM only; no password captured by agent or committed.
  Next: operator creates migrator and runs that local script, replying “saved”;
  verify account scope and credential connectivity before any service outage.
  Fresh candidate CI run 38996688408 remains completed/success on `0d4ae28a`.
  Initial CI lookup had a Node module-mode syntax error; corrected read succeeded.
  Fresh origin fetch succeeded; clean task branch resumed from `b60ab65e`.
  Usage at this resumption: five-hour 93%, weekly 53% remaining, same reset times
  as the 19:51 observation below. No source-data changes, downtime or migrations.

- Resumed **19:49–19:55 Bangkok**: operator explicitly approved the concrete
  attended maintenance package (“yes run it now”). Clean existing task branch;
  origin fetch succeeded, current `origin/dev` remains `0d4ae28a`, included in
  task HEAD `c5c2c399`. Usage 19:51:18: five-hour 97% remaining, weekly 54%;
  resets 2026-10-18 00:49:02 and 2026-10-22 13:13:35 Bangkok respectively.
  Prepared an unsubmitted Atlas reader form: `poker_release_reader_20261017`,
  `read@poker_playtest`, Cluster0 only, six-hour expiry. Human password entry and
  submission are required by browser credential policy. No provider settings,
  source data, users or downtime changed. Next: operator enters a new password
  and clicks Add User; verify scope, privately load credentials, prepare migrator,
  then freshly recheck providers/CI and begin the approved shutdown/backup gates.

- Maintenance preparation **13:26–13:39 Bangkok**: user reports the masked
  handwritten-key recovery worked. Recorded operator-reported success; no key
  sent through chat. Verified a new native MongoDB→age→D:→age→restore stream with
  two synthetic records in a network-disabled/tmpfs container: documents/indexes/
  validators matched, both process exits checked, no plaintext archive on disk.
  Manifest/sample retained outside Git. Captured full active Worker version
  `483fb438-be71-4020-81ea-497013ebf36f`; Render remains on candidate `0d4ae28a`.
  Prepared the scoped maintenance package in the existing release record: exact
  source/restore targets, six-hour reader/migration roles, provider pauses/drain/
  suspension proof, consistent encrypted dump/isolated audit, migration replay,
  human-entered proxy rotation, reopening settings and stop/forward-fix rules.
  No provider/DB mutation or live dump authorized/executed. Prior commit `c0acb8fe`;
  same branch/draft PR #33. Next: obtain explicit approval of that concrete package
  and a no-active-players window; hand off private credential entry to the operator.
  A host-port/internal-network preflight failed. Replacement network-none MongoDB
  plus companion Node namespace passed on a synthetic authenticated replica:
  unchanged verifier succeeded, read-only write denied, zero published ports/default
  route. Audit bundle v2 copies 13 existing dependencies; type-only manifest resolution
  fixed initial packaging. No app dependencies/source changed. The package excludes
  the failed arrangement. Local stream and isolation fixtures were removed after checks.
  Usage observed **13:26:55 Bangkok**: five-hour **99% remaining**, weekly **57%**;
  five-hour reset **2026-10-17 18:26:55**, weekly **2026-10-22 13:13:35** Bangkok.
  Handoff usage at **13:39:26 Bangkok**: five-hour **83% remaining** (reset
  **2026-10-17 18:26:56**), weekly **55%** (same reset). No usage blocker.
  Follow-up documentation self-review, whitespace and 13 relative
  file links passed; no full app/browser-suite rerun. Publish to the same draft PR.
- Follow-up **12:34 Bangkok**: operator confirms recovery key written on paper;
  retention is attested, paper-copy decryption is still pending. Original identity
  through stdin decrypts the harmless sample successfully; PowerShell 7 masked
  entry can test the paper copy without exposing it in chat/history. Render URI
  hostname matches Atlas `poker_g/Cluster0` exactly; only sanitized metadata read,
  URI re-masked. Runtime target pairing is resolved. No live DB mutation/dump.
  Docker startup initially returned a missing Linux pipe, then became ready:
  engine 28.3.3, dump/restore 100.14.0 in isolated `mongo:8.0.17` containers.
  At 12:35 Bangkok `pnpm test:backup` passed 1/1 plus dependency/server builds:
  metadata, restored auth/receipts/equipment/economy; 797 ms restore, 7,254 ms
  procedure, zero fixture progress lost. This is local generated data only.
  BitLocker inspection failed with access denied, so encrypted staging is unverified.
  Follow-up documentation diff/whitespace/13 relative links reviewed. Prior commit `73927b80`;
  same draft PR #33. Next: operator runs the masked sample test with handwritten
  key, then resolve staging/streaming and the scoped maintenance package.
- Storage follow-up at **11:56 Bangkok**: user declined Google Drive, selected D:
  and explicitly accepted its internal-SSD limitation. Prepared `D:\PokerBackups`
  (`archives/manifests/samples/tools`) with current-user/SYSTEM-only ACLs; about
  104 GiB free. Retained age identity is separate in the private Windows profile
  `.poker-backup-keys` directory; no key material in Git/chat/backup folder.
  Official age v1.3.2 download SHA-256 verified. Synthetic retained-file decrypt
  matched source bytes; wrong key and tampered archive were rejected; ACL checks
  passed. No plaintext file/database access/hosted backup. Offline key copy and
  independent retrieval, encrypted staging and writer shutdown remain pending.
  Next: operator saves a separate offline identity copy, then demonstrate recovery
  and finish the exact maintenance/backup/migration approval package. PR remains
  draft #33 on the same branch; last prior saved commit `9795c30f`. Storage follow-up
  documentation self-review, whitespace and 13 relative file links passed; no
  application/configuration changes or application-suite rerun.
  Usage observed **2026-10-17 11:56:18 Bangkok**: five-hour **60% remaining**
  (reset **12:40:06** today); weekly **60% remaining** (reset **2026-10-22
  13:13:35** Bangkok). No usage blocker or billing action.
- User requested implementation of the plan in [PR #32](https://github.com/24-HUB/poker-game/pull/32).
  New clean task branch `codex/hosted-release-inventory` starts from fetched
  `origin/dev` `0d4ae28a9c404de8d7d9db089543a60e1fe18673`. Plan PR remains open;
  read it from its remote branch when needed. Execute inline; no delegation.
- Task 1 is in progress. Created [release inventory](docs/releases/2026-10-17-private-release.md),
  inspected signed-in Render and Cloudflare dashboards and exact candidate CI.
  Both live artifacts use `0d4ae28a`; Worker displays version `483fb438` at 100%
  traffic. Render is Free/Singapore with sessions enabled, purchases disabled,
  Auto-Deploy after CI and Blueprint Auto Sync enabled. Target database name is
  `poker_playtest`. After user sign-in, Atlas project `poker_g`, Free `Cluster0`
  (MongoDB 8.0.34, AWS Singapore, three-node replica set) contains that database
  with 25 collections, 44 indexes and schema rows 1–5 only. Required 006–007 are
  absent here. Stored progression exists: 4 users, 3 wallets, 28 reward receipts.
  Preserve it; confirm this cluster matches the Render URI privately before mutation.
- Corrected runbook flags and backup schema 001–007. Recorded Worker name mismatch,
  provider-native Git build triggers, missing safe rollback pair and unverified
  full-writer shutdown. Cloudflare stores the proxy credential as a plaintext
  Variable; prepare coordinated rotation to a Secret plus matching Render value.
  Do not copy the exposed value. No provider mutation, email, deployment or DB operation.
- Ruling: preserve all hosted data. Task 2 storage and the operator-reported
  handwritten-key sample recovery are recorded above; live shutdown/restore remain pending. Tasks
  3–7 depend on concrete target/window approval, hosted acceptance and recovery.
- Checks: inspected candidate CI verify job
  [success](https://github.com/24-HUB/poker-game/actions/runs/38996688408/job/117290696108),
  including migration replay, aggregate, backup/restore, Linux Worker and Chromium.
  Complete documentation diff self-review, `git diff --check` and all 14 relative
  file links passed. Final fetch confirms latest `origin/dev` is included.
  Initial commit `40d9f7a2` is pushed in draft [PR #33](https://github.com/24-HUB/poker-game/pull/33),
  base `dev`; Atlas findings saved/pushed in `522e0958`. Final whitespace/link
  checks passed again and working tree was clean; latest `origin/dev` is included.
  No application suites rerun for docs. This publication note is documentation only.
- Resume: Atlas sign-in/metadata inspection completed. Confirm runtime/cluster
  pairing privately, retain a backup and prepare scoped authority for missing
  migrations 006–007; confirm whether progress matters and finish inventory gates.
  Prepare the exact storage/key/shutdown and credential-rotation package before
  requesting live actions. Never rerun fixture suites against hosted data.
- Usage observed **2026-10-17 10:25:38 Bangkok**: five-hour **75% remaining**
  (reset **2026-10-17 12:40:06**), weekly **62% remaining** (reset
  **2026-10-22 13:13:35**). No usage blocker. GitHub CLI is unavailable on PATH;
  Git fetch succeeded with sandbox escalation; GitHub browser access works.

## Bot-player CI regression follow-up — 2026-10-16

- Continued `codex/bot-player-plan`, [PR #31](https://github.com/24-HUB/poker-game/pull/31),
  base `dev`, from `0886609e`. All feature code was already implemented; this
  follow-up changes browser tests and documentation only.
- CI run `38742584198` passed `pnpm check` (including all 282 server tests),
  migration idempotency, encrypted backup/restore and Worker packaging, then
  failed two Chromium timing assumptions. Both were reproduced locally:
  wallet labels matched hidden retained content during access recovery, and
  publication could disconnect a revoked guest before its takeover click.
- Tests now explicitly cover delayed recovery with scoped visible wallet checks,
  and a host publication automatically removing the revoked guest. Actions have
  bounded timeouts; cleanup preserves the original failure. Both cases passed
  three repetitions each (**6/6**). Fresh `CI=true` full Chromium **35/35 passed**
  in 4.2 minutes; web typecheck and whitespace checks passed.
- Logs: ignored `.artifacts/bot-players-2026-10-15/{ci-races-red,ci-races-green,browser-resumed-full}.log`.
  Latest fetch confirms `origin/dev` `17a43ba5` is included. Restore the generated
  dev-only `next-env.d.ts` paths before committing; no application edits pending.
- Publication sequence: commit this follow-up, push the explicit task branch,
  inspect its new CI run, and mark PR ready only after it passes. The PR's live
  checks are the source for post-publication status. User merges manually.
  No deployment or hosted migration was performed.
- Usage observed 2026-10-16 **20:00 Bangkok**: five-hour **83% remaining**,
  resets 2026-10-17 **00:10:34**; weekly **68% remaining**, resets 2026-10-22
  **13:13:35** Bangkok. No usage blocker or billing action.

## Bot-player verified implementation save point — 2026-10-15

- Feature implementation is complete on `codex/bot-player-plan`, published in
  [PR #31](https://github.com/24-HUB/poker-game/pull/31), base `dev`.
  Last code/test commit: `004760ea`; this save-point commit changes documentation
  only. No pending application changes. User merges manually; no deployment or
  hosted migration was performed.
- Fresh local full Chromium **35/35 passed** in 4.4 minutes, including solo bots,
  mixed play, takeover/reload, practice history and later standard ticket rewards.
  Desktop/mobile screenshots inspected. Contracts **19/19**, engine **21/21**,
  frontend **177/177**, economy audit **29/29**, affected server **56/56** and
  production builds passed. Independent review fixes were verified; no remaining
  Important findings. Generated `next-env.d.ts` dev imports were restored.
- Local aggregate ran 282 server tests: 281 passed and one catalogue setup hook
  timed out at five seconds; isolated catalogue rerun **2/2 passed**. The
  [Linux implementation run](https://github.com/24-HUB/poker-game/actions/runs/38741106896)
  has already passed `pnpm check`, migration idempotency, backup/restore rehearsal
  and Worker packaging. Its final Chromium step was still running at this save
  point, so PR remains draft pending CI completion. Logs are ignored under
  `.artifacts/bot-players-2026-10-15/`.
- Next: inspect the latest PR CI (including the documentation-triggered rerun),
  fix any actual failure, then mark PR ready after required checks succeed.
  Resume with `git status --short --branch`, usage, `git fetch origin --prune`
  and this save point; do not reimplement completed tasks. Prior final fetch
  confirmed `origin/dev` `17a43ba5` is included; fetch again before final handoff.
- Usage observed 2026-10-15 **20:24 Bangkok**: five-hour **5% remaining**,
  resets 2026-10-16 **00:03:39**; weekly **72% remaining**, resets 2026-10-22
  **13:13:35** Bangkok. Save-point threshold reached; finish only bounded
  verification/publication work. No billing or reset-credit action.

## Bot-player implementation — verification in progress, 2026-10-15

- The user approved the implementation plan. Feature code is on
  `codex/bot-player-plan`, updating [draft PR #31](https://github.com/24-HUB/poker-game/pull/31)
  targeting `dev`. Implementation commits through `0fce9719` cover contracts,
  host-owned bot seats, immutable practice mode, economy protection, restricted
  casual strategy, fenced turn/retry timers, presence pause/cleanup and room/table UI.
- Independent review found two timer-recovery bugs; both were reproduced and
  fixed, and focused follow-up found no remaining Important findings. A final
  lease recheck after asynchronous reads was also reproduced and fixed.
- Passed: frozen pnpm 10.33.0 install, contracts 19/19, engine 21/21, frontend
  177/177, economy audit 29/29, real Socket.IO observer/revocation/reconnect,
  and latest affected server suites 56/56. Lifecycle acceptance includes one
  human against 1–5 bots, strategy fallback, stale callbacks, retained countdowns,
  pending settlement after retention and authority/shutdown cancellation.
- Solo Chromium acceptance passed, including five-seat bot roster, private cards,
  bot thinking, practice history/no rewards, post-reload tab takeover, bot removal
  and subsequent human-only rewards. Inspected 360px/1440px room/table screenshots.
  A mixed human/bot takeover/reload browser case is prepared but not yet run.
- Aggregate rerun is in progress. Previous run passed 280 server tests and failed
  one catalogue assertion expecting six migrations; updated it to seven. An
  earlier audit fixture lacked durable session data and now uses a valid isolated
  two-human session (one qualifying account); the audit passes. A browser-discovered
  BSON undefined-to-null equipment issue is fixed with explicit default equipment.
- Next: inspect `.artifacts/bot-players-2026-10-15/check.log`, complete full fresh
  Chromium acceptance, inspect current PR CI/Worker packaging, then record final
  evidence and publish. `next-env.d.ts` has a generated dev-path change; production
  build restores it. No deployment or hosted migration. User merges manually.
- Fetch confirms latest `origin/dev` `17a43ba5` is included. Usage observed
  2026-10-15 20:14 Bangkok: five-hour **16% remaining**, reset 2026-10-16
  **00:03:39**; weekly **74% remaining**, reset 2026-10-22 **13:13:35** Bangkok.

## Bot-player implementation plan — 2026-10-15

- The user requested implementation of [PR #31](https://github.com/24-HUB/poker-game/pull/31),
  approving its written specification. Continued clean existing task branch
  `codex/bot-player-plan`; authenticated PR read confirmed open/draft, targeting `dev`,
  with no inline review comments. Last published commit before this plan: `bf78510d`.
- Prepared and self-reviewed the [implementation plan](docs/superpowers/plans/2026-10-15-bot-player-implementation.md):
  contracts/compatibility, roster/session admission, durable economy guards and
  migration 007, fair-information strategy, fenced timers/presence lifecycle,
  UI/browser acceptance and verification/publication. All execution steps remain
  unchecked; no application code or configuration has changed.
- Review checked actual source boundaries, manifests, test paths and migration
  registration. The Superpowers writing-plans workflow requires user plan review
  before execution. Next: review the plan, then execute Task 1 inline on this same
  branch/PR after approval; first run status/branch, usage and fetch. Preserve
  completed planning work and do not repeat the product-design interview.
- Documentation validation: source/link accuracy, spec coverage and self-review,
  placeholder scan and whitespace/full-diff checks. Application checks have not
  run for this documentation-only step; the plan's commands are future checks.
- Successful fetch confirms this branch contains latest `origin/dev` `17a43ba5`.
  Publish this plan/checkpoint to existing draft PR #31. The user merges manually;
  no deployment or hosted migration is authorized.
- Usage observed 2026-10-15 19:34 Bangkok: five-hour **85% remaining**, reset
  2026-10-16 **00:03:39**; weekly **85% remaining**, reset 2026-10-22 **13:13:35**
  Bangkok. No usage threshold blocker or billing action.

## Bot-player specification — 2026-10-15

- New task branch: `codex/bot-player-plan`, created from freshly fetched
  `origin/dev` `17a43ba5`. The user approved host-added bots for solo/friends,
  practice sessions without tickets, a pre-session-only roster, one casual
  difficulty, 1–3 second turns, ending when all humans bust, and two-minute
  disconnect pause/reconnect. Bots never become host or see hidden opponent cards.
- [Written specification](docs/superpowers/specs/2026-10-15-bot-player-design.md)
  records those choices and proposed contracts, identity compatibility, immutable
  practice mode, settlement/economy guards, deterministic strategy, fenced timers,
  pause/cleanup rules, UI changes, migration preparation and acceptance coverage.
  No application code/configuration changed; implementation has not begun.
- Published specification commit: `fbb711f1`, in
  [draft PR #31](https://github.com/24-HUB/poker-game/pull/31), explicitly targeting
  `dev` and attached to this chat. Only the spec and existing checkpoint files
  changed. This publication-record correction follows that commit.
- Passed: source-path/placeholder checks, repository accuracy/self-review,
  `git diff --check`, staged/full-task whitespace checks and full documentation
  diff review. Final fetch confirms this branch contains latest `origin/dev`
  `17a43ba5`. Application tests were not run for documentation-only changes.
- Next: the user reviews the written specification. After approval, use
  writing-plans to create the implementation plan on this same branch/PR.
  No application changes are pending. The user merges manually; do not merge
  or deploy. Resume with status/branch, usage, fetch and this checkpoint.
- Usage observed 2026-10-15 at 19:21 Bangkok: five-hour **90% remaining**
  (resets 2026-10-16 **00:03:39** Bangkok), weekly **86% remaining** (resets
  2026-10-22 **13:13:35** Bangkok). No usage threshold blocker or billing action.

## Automatic server recovery implementation — locally verified, 2026-10-14

- The user requested implementation of [PR #30](https://github.com/24-HUB/poker-game/pull/30).
  Continued its existing `codex/server-recovery-spec` branch; implementation commit
  `e2dd67a5`. The PR targets `dev`; the user merges manually.
- One shared coordinator checks only session GET `/api/me`, with a 90-second
  wall-clock window, five-second post-completion delay, 20-second request/body
  bound, 18-request cap, lifecycle cancellation and stale-read rejection. Valid
  account/401 stops checking. Rate limits honor Retry-After; blocked and exhausted
  states require explicit Retry. Auth/game/economy mutations are not replayed by
  recovery, and no healthy-state polling or keep-alive was added.
- Header and private-access boundaries share honest status and Retry controls.
  Keyboard focus moves to Sign in/the verified account without opening a dialog.
  Inspected 360px/1440px recovery screenshots and reduced motion; no overflow.
- Review reproduced and fixed room/game/pending-command loss during recovery and
  same-account pending-pull resubmission. The current destination retains its
  component state, while each new pathname must pass navigation gating before
  mounting. Private views/actions require the currently verified identity.
  Independent final review found no remaining Important findings.
- Passed: pinned frozen install; aggregate `pnpm check` (server **236/236**,
  contracts **16/16**, engine **21/21**, script suites, typechecks and builds);
  final frontend **174/174**, frontend typecheck and production build; fresh
  CI-mode full Chromium **33/33**. Real Socket.IO and isolated replica-set checks
  ran. No lint script exists. Earlier browser fixture failures are superseded:
  current status copy, visible account selection and authoritative host selection
  now pass. Delayed one-minute recovery, offline/hidden pause, terminal restart,
  keyboard focus, restart, privacy and existing economy flows are covered.
- Verification logs/screenshots are local ignored artifacts under
  `.artifacts/server-recovery-implementation-2026-10-14/`; no credentials are
  included in committed evidence. There are no pending application changes or
  known local check failures. CI/Worker packaging must be inspected after push.
- Successful fetch before publication confirms this branch contains latest
  `origin/dev` `af8aaa02`. No automatic merge/rebase, deployment or production
  database operation. A natural Render sleep/wake drill remains a separate
  authorized playtest; controlled clocks do not establish provider timing.
- Next: commit/push this publication checkpoint to the same PR, then inspect its
  latest CI with `dev` as base. Resume with `git fetch origin --prune` and a usage
  reading; do not repeat implemented steps. The user reviews and merges manually.
- Final usage reading on 2026-10-14 at approximately 22:36 Bangkok: five-hour
  **53%** and weekly **46%** remaining; resets 2026-10-15 **02:40:01** and
  2026-10-20 **12:12:42** Bangkok, respectively. Earlier temporary usage-tool
  unavailability resolved. No usage threshold blocker or billing action.

---

## Automatic server recovery specification — 2026-10-14

- Task branch: `codex/server-recovery-spec`, from fetched `origin/dev` `af8aaa02`.
  [Specification](docs/superpowers/specs/2026-10-14-server-recovery-design.md)
  defines one visible-page session recovery loop, a 90-second window, five-second
  post-response spacing, request/cancellation bounds and safe error handling.
- Live diagnosis reproduced 504 `Backend timeout` after about 15.7 seconds;
  readiness later returned 200 and signed-out `/api/me` returned 401 in under
  one second. Render cold start is strongly supported; instance logs were not read.
- Earlier diagnosis passed 29/29 existing auth/session/UI/proxy tests. These are
  baseline results, not automatic-recovery verification. This task changes only
  documentation; implementation, new tests and deployment are pending.
- Published specification commit: `0ba10c4c`, in
  [draft PR #30](https://github.com/24-HUB/poker-game/pull/30), explicitly targeting
  `dev`. Only the spec and existing checkpoint documents changed.
- Passed: documentation accuracy/self-review, local spec link check,
  `git diff --check` and full `git diff origin/dev --check`. Application checks
  were not rerun for this documentation-only task. Final fetch confirms this
  branch contains latest `origin/dev` `af8aaa02`; working tree was clean before
  this publication-record update. No merge/rebase or deployment.
- Next: open the specification and review its behavior/acceptance before requesting
  implementation. Continue this task's branch/PR if still open, or start from
  freshly fetched `origin/dev` if the PR has already merged. The user merges manually.
- Usage observed 2026-10-14 21:48 Bangkok: five-hour 96% and weekly 52% remaining;
  resets 2026-10-15 02:40:00 and 2026-10-20 12:12:41 Bangkok, respectively.
  No usage threshold blocker or billing action.

---

## PR #29 CI follow-up — 2026-10-14

- Same task and branch `codex/hand-result-ux-spec`, PR #29 targeting `dev`.
  Prior published head `28f3f7d8` failed Linux Chromium acceptance: 26/28 passed.
- Reproduced a stale history disclosure request reopening history in a new session.
  Requests now match account, room and session; the regression failed before the
  fix and passes afterward. Browser assertions explicitly select the live table.
- The subsequent poker start timeout did not reproduce locally. The preceding
  failed test left a session finishing, which may have blocked the next start under
  the single-active-session limit. Added public command/connection diagnostics;
  this explanation remains an inference until fresh Linux CI confirms recovery.
- Passed: frozen install, frontend 145/145, typecheck, production build and full
  CI-mode Chromium 28/28. Independent review found no Important issues.
- Next: commit and push this follow-up to the same PR, inspect fresh Linux CI,
  fetch origin and confirm branch freshness before final handoff. The user merges
  manually. No deployment or production data operations.
- Usage observed 2026-10-14 17:55 Bangkok: five-hour 18% remaining, weekly 55%
  remaining; resets 2026-10-14 21:20:51 and 2026-10-20 12:12:42 Bangkok.

---

## Hand-result implementation — locally verified, 2026-10-14

- User approved implementation of PR #29's specification and updates to the same
  PR. Branch `codex/hand-result-ux-spec`; implementation commit `74d87b98`.
  [PR #29](https://github.com/24-HUB/poker-game/pull/29) targets `dev`.
- Added version-1 committed public presentation: outcome reason, actual board,
  deterministic best five, ranking/combination/kickers, public participant identity,
  per-pot awards and separate uncalled returns. Folded private cards are excluded.
  Older records retain payouts with “Detailed cards unavailable”.
- Replaced the dismissible toast with inline showdown/fold results and shared
  history rows. Seats show authorized reveals, settled stacks and winner badges.
  Accounting distinguishes awards, returns and net; session leaders are separate.
- Exposed the existing five-second server transition timestamp and intent. Clock
  receipt is recorded once per snapshot; reconnect, ending, pause and zero remain
  truthful. Terminal board survives live-hand cleanup; unavailable own cards are
  omitted after cleanup. New hands clear prior winner treatment.
- Fixed internal MongoDB `_id` leaking into public reward receipt projection.
  Independent review identified paused confirmed-result retention and removed-control
  focus; both reproduced RED and passed GREEN after fixes. Re-review found no
  Critical/Important blockers. Card labels now use supported accessible roles.
- Passed: frozen install; `pnpm check` (server **236/236**, contracts **16/16**,
  engine **21/21**, script suites, typechecks and configured builds); final frontend
  **144/144**, frontend typecheck and production build after review corrections;
  full Chromium **28/28**. No lint script exists. Real Socket.IO privacy/reconnect
  and isolated replica-set settlement/history tests ran successfully.
- Inspected showdown with two players and flop fold with six at 1440×900,
  900×900, 390×844, 355×767 and 360×480; no seat overlap or horizontal page overflow.
  The completed room keeps the table shell so mobile navigation cannot cover cards.
  Keyboard/reduced-motion/four-colour checks and a 200% browser-zoom equivalent
  (720×450 CSS viewport, pixel ratio 2) passed. Detector returned `[]`.
- Browser fixture corrections wait for completed joins, use the current host and
  reclaim a refreshed tab when needed. Existing release assertions now verify the
  structured showdown/board/pot details and absence of completed-hand betting
  controls. Earlier fixture failures are superseded by the full **28/28** run.
- Last completed code step is `74d87b98`; implementation and the first verification
  checkpoint are pushed through `b1b8afd1`. PR #29's title/description now describe
  implementation and retain base `dev`. This follow-up records publication and
  closes the plan checklist; no application work remains.
- CI on `b1b8afd1` was [in progress](https://github.com/24-HUB/poker-game/actions/runs/38551136128)
  at inspection. This documentation follow-up starts a fresh head run. Next: inspect
  PR #29's latest Linux CI/Worker packaging, then review and merge manually only
  after checks pass. Do not merge or rebase `dev` automatically.
- Final successful fetch at 2026-10-14 17:41 Bangkok confirms `origin/dev` `7927a9c4`
  is contained. Hosted acceptance, a native screen-reader run and physical
  phone keyboards remain playtest checks. No deployment or production data operation.
- Usage observed 2026-10-14 17:37:44 Bangkok: five-hour **27% remaining**, weekly
  **56% remaining**; resets 2026-10-14 21:20:51 and 2026-10-20 12:12:42 Bangkok.
  No below-10% pause or billing action. The user merges manually.

---

## Hand-result UX/UI specification — 2026-10-14

- Task branch: `codex/hand-result-ux-spec`, based on fetched `origin/dev`
  `7927a9c4`; no application files changed.
- [Proposed specification](docs/superpowers/specs/2026-10-14-hand-result-ux-design.md)
  translates both supplied references into showdown/fold layouts, privacy and
  accounting rules, responsive states, proposed data requirements and acceptance.
- Read the existing table, history, contracts, game progression and projection.
  Five-second result scheduling already exists; public transition timing and
  durable board/rank details need implementation work after design review.
- Specification and whitespace correction are pushed through `aef8c416` in
  [draft PR #29](https://github.com/24-HUB/poker-game/pull/29), targeting `dev`.
  Full documentation reviewed; `git diff --check` and
  `git diff origin/dev --check` pass after correcting one trailing space.
  Application tests were not run for this documentation-only task.
- Final fetch at 2026-10-14 16:38 Bangkok confirms this branch contains latest
  `origin/dev` `7927a9c4`. No merge/rebase or application change.
- Latest usage observed during handoff: five-hour 74% remaining, weekly 64%
  remaining; resets 2026-10-14 21:20:50 and 2026-10-20 12:12:42 Bangkok,
  respectively. No threshold-triggered pause or billing action.
- Next: review the proposed specification in PR #29, then request any revisions
  or implementation planning. Implementation is not started; the user merges
  manually. This follow-up commit records the completed documentation handoff.

---

## PR #28 CI corrections — Linux verification passed, 2026-10-13

- Commit `4d2ec8ab` is pushed on `codex/room-ux-audit` in PR #28 (base `dev`).
  [Fresh Linux CI](https://github.com/24-HUB/poker-game/actions/runs/38407645869)
  completed successfully, including aggregate checks, backup rehearsal, Worker
  build and full Chromium acceptance **27/27**. Both reported failures are resolved.
- This save point changes only documentation; its normal PR CI may run again.
  No application changes are pending. Next: review the latest PR checks and let
  the owner merge manually. The earlier CI-pending entry below is historical.
- Usage at final CI check: five-hour **5% remaining**, weekly **69% remaining**;
  reset 2026-10-13 23:39:47 Bangkok and 2026-10-20 12:12:41 Bangkok respectively.
  Below-10% decision: verified fixes are already saved remotely; finish this
  bounded documentation save point and stop implementation. Recheck usage and
  fetch origin before any resumed work. No billing/reset-credit action.

---

## PR #28 CI follow-up — local verification complete, fresh CI pending

- Resumed on clean `codex/room-ux-audit` after fetch; previous save point was
  `6309b6db`. [CI run 38405004222](https://github.com/24-HUB/poker-game/actions/runs/38405004222)
  failed on the ambiguous mock-account sign-in selector and mobile action-panel
  geometry (791px bottom in a 767px viewport). Prior Windows 27/27 evidence did
  not establish Linux CI success; the PR was not ready to merge.
- Scoped mock-account sign-in to the header banner. The regression now deliberately
  visits signed-out Collection, where header and inline sign-in controls coexist;
  the original selector reproduced RED and the scoped selector passed GREEN.
- Put the mobile amount slider beside the numeric field, removing a separate
  32px slider row plus its gap. Only the redundant numeric output is hidden;
  cards, numeric input, slider, presets and primary legal actions remain visible.
  Kept viewport assertions unchanged, added fallback-font coverage and explicit
  input/slider/preset visibility checks. The original Linux overflow is CI evidence;
  it did not reproduce with the local Arial fallback before the fix.
- Passed: frozen install; CI-mode release/mock-account browser tests **4/4**;
  fresh `pnpm check` (frontend **131/131**, backend **233/233**, shared suites,
  typechecks and production builds); complete focused diff and whitespace checks.
  This follow-up did not rerun all Chromium tests locally. Fresh full Linux CI
  is required before calling the PR ready to merge.
- Next: push this checkpoint/fix commit to the same PR, inspect its latest CI run,
  and let the owner merge manually only after checks pass. If it fails, retrieve
  its `verify` job logs and fix the specific failure; do not loosen assertions.
  Resume starts with `git status --short --branch`, usage check and
  `git fetch origin --prune`. No deployment, production data or billing action.
- Usage observed 2026-10-13 13:44:50 UTC: five-hour **10% remaining**,
  reset 2026-10-13 16:39:47 UTC /23:39:47 Bangkok; weekly **70% remaining**,
  reset 2026-10-20 05:12:41 UTC /12:12:41 Bangkok. Below 10% triggers a bounded
  completion/save-point decision; this verified correction is being saved before
  further implementation. No reset-credit action.

---

## UX audit fixes — implemented and pushed, 2026-10-13

- Owner requested implementation of the audit handoff and updates to the same PR.
  Branch `codex/room-ux-audit`; implementation commit `37964d3e` is pushed in
  [PR #28](https://github.com/24-HUB/poker-game/pull/28), base `dev`.
- Implemented layout-owned Socket.IO continuity, readiness gating after reconnect,
  cancellation/account/room fencing, stale-room isolation and synchronization retry.
  Mobile actions/results occupy document flow; waiting-room actions precede seats.
  Join/create forms retain drafts/errors through authentication, contextual signed-out
  destinations offer inline access, and zero-ticket players have earning guidance
  and a safe play route. Alice is the free default avatar; selected equipment is
  read from the server. Cosmetic-pull navigation, invitation expiry, touch targets,
  accessible player-name disclosure and bet/raise draft boundaries are corrected.
- Native session-end confirmation is retained. Real dialog-aware tests verify cancel,
  confirm, ending state, committed settlement/standings and refresh. The original
  audit automation stall is not classified as a proven ordinary-user failure.
- Independent read-only review found four Important issues; all have regression
  coverage and fixes. Draft remount, reconnect readiness, cross-room state and
  expanded-name overlap were reproduced RED-to-GREEN. Full browser testing also
  reproduced/fixed a host-start/guest-sync race against the latest room snapshot.
- Passed with Node 22.16.0/pnpm 10.33.0: frozen install; final `pnpm check`
  (frontend **131/131**, backend **233/233**, contracts **15/15**, engine **18/18**,
  configured script suites, typechecks and production builds); full Chromium
  `pnpm --filter @poker/web test:e2e` **27/27**; diff/whitespace checks and
  Impeccable detector `[]`. Earlier failed fixture selectors and sync/geometry
  regressions were corrected; the final complete runs passed. No lint script exists.
- Browser evidence includes six players, own/opponent turns, invalid amount, privacy,
  real takeover/reconnect, unequal all-ins/side pots, rewards, session end, auth draft
  recovery and full-room errors. Own-turn geometry passed at 355x767, 360x800,
  390x844 and 1440x900; 360x480 controls remained reachable. Expanded-name geometry
  passed without covering cards. Screenshots/logs are ignored local artifacts.
- Deferred minor polish: lobby avatar request failure has no dedicated retry
  presentation; some internal recovery/collection copy retains themed invitation
  language. Physical phone keyboards, comprehensive screen-reader/text-scaling and
  hosted acceptance remain playtest checks. Standard PR CI includes the Worker
  bundle check, which was not rerun locally. No deployment/production operation.
- Final fetch confirms the branch includes `origin/dev` `502d50e8`; no merge/rebase.
  Local browser services and the disposable MongoDB containers were stopped.
  Only task-owned files were committed; generated Next.js drift is excluded.
- Next: review PR #28 and its CI (including the Worker bundle), then the owner
  merges manually. No automatic merge, branch deletion, deployment or billing action.
- Usage observed 2026-10-13 13:24:58 UTC / 2026-10-13 20:24:58 Bangkok:
  five-hour **18% remaining**, reset 2026-10-13 16:39:47 UTC /
  2026-10-13 23:39:47 Bangkok; weekly **71% remaining**,
  reset 2026-10-20 05:12:42 UTC / 2026-10-20 12:12:42 Bangkok.
  Recheck on resumption; below 10% in any applicable window triggers a save-point
  decision. No reset-credit or billing action was taken.

---

## UX audit implementation brief — PR handoff, 2026-10-13 19:01 Bangkok

- User requested a Markdown implementation handoff covering the live UX audit
  and local two-player review, explicitly including usage-limit handling.
- Branch: `codex/room-ux-audit`, based on `origin/dev` `502d50e8`; brief committed
  as `d2dfaf7c` (`docs: capture UX audit implementation brief`). Read
  [the implementation brief](docs/superpowers/specs/2026-10-13-ux-audit-implementation.md).
  No application fix is implemented. The acceptance checkboxes are intentionally
  unchecked; observations and proposed remedies are distinguished.
- The brief covers mobile card overlap, controller continuity, waiting-room
  hierarchy, join-error recovery, contextual authentication, terminology/avatar
  consistency, ticket guidance, touch targets, player names and betting labels.
  Native confirmation stalled browser automation; successful session ending is
  explicitly unverified, not labelled a proven production failure.
- Verification: audited the brief against observed browser evidence, current
  source, `plan.md`, the prior room specification and actual package scripts.
  `git diff --cached --check` passed for the brief. No application tests were
  rerun for this documentation-only handoff. Local review screenshots are ignored
  artifacts, not portable or committed evidence. Local test services were stopped.
- Remote save completed after the user explicitly approved the push and PR.
  Commits `d2dfaf7c` and `8434a4e2` were pushed with
  `git push -u origin codex/room-ux-audit`; [PR #28](https://github.com/24-HUB/poker-game/pull/28)
  targets `dev` and is attached to this chat. The earlier automatic-review push
  blocker is resolved. These checkpoint corrections accompany the next commit;
  no application edits are pending.
- Next: review PR #28 and its CI, then the owner merges manually. No automatic
  merge, branch deletion or deployment. GitHub CLI was unavailable; PR creation
  used the authenticated GitHub API without printing credentials.
- Before application implementation: recheck usage and working-tree state, fetch
  origin, read this checkpoint and plan section 18, and reproduce UX-01/UX-02.
  Do not treat this documentation request as completed application fixes.
- Usage at 2026-10-13 12:01:51 UTC /19:01:51 Bangkok: five-hour **80% remaining**,
  reset 2026-10-13 16:39:47 UTC /23:39:47 Bangkok; weekly **81% remaining**,
  reset 2026-10-20 05:12:42 UTC /12:12:42 Bangkok. Recheck on resumption. Below
  **10% in any applicable window** triggers a bounded-step/save-point decision;
  update this file and plan section 18, preserve work and actual check results.
  Never buy credits, redeem reset credits or change billing automatically.

---

## Account email codes — implementation complete, 2026-10-13 09:42 Bangkok (02:42 UTC)

- Owner explicitly directed immediate implementation, overriding the additional
  plan-review pause. Continued on `codex/account-email-codes` from `origin/dev`
  `bf472463`; no unrelated work was present. Implementation commit `67c34997`
  is pushed in [PR #27](https://github.com/24-HUB/poker-game/pull/27), base `dev`.
- Implemented six-digit/600-second verification and reset, keyed-hash storage,
  latest-generation/single-use challenges, durable five-attempt limits,
  address/purpose cooldown and hourly bounds, trusted-IP bounds with Retry-After,
  transactional reset/verification/session revocation and legacy-route retirement.
  Better Auth 1.7.6 still owns registration, password hashing and uncached sessions.
  No automatic login; reset verifies an unverified email and preserves ID/economy.
- Updated Brevo messages, native auth responses, shared code-entry/reset forms,
  retained-email sign-in transitions, uncertain-result copy, focus/keyboard/refresh
  behavior and cooldown display. Browser/local mock fixtures submit native codes;
  production capture/shortcut routes remain unavailable. Secret-bearing trace,
  automatic screenshot/video and failure-page snapshot capture are disabled.
- Independent read-only review found three Important issues, all reproduced and
  fixed RED-to-GREEN: duplicate signup issuance, hashing before IP admission and
  account eligibility exposed by delivery timeout. Real Brevo sends share a bounded
  five-second response window across eligibility outcomes. Final compatibility
  review also reproduced/fixed canonical Origin handling for trailing-slash config.
- Passed: pinned Node 22.16.0/pnpm 10.33.0 frozen install; `pnpm check`; final full
  backend suite **233/233**, final full frontend suite **121/121**, full Chromium
  **23/23**; final backend/frontend typechecks and `pnpm build`. Worker bundle
  passed in disposable Linux Docker with Node 22.16.0/pnpm 10.33.0 and read-only
  source. Native/transaction tests cover real replica-set races, forced retries,
  rollback at all writes, persisted attempts, sessions and owned-cosmetic/wallet
  preservation. Desktop, 360px mobile and shortened 480px-height viewport evidence
  confirms reachable controls and no horizontal overflow; physical phone keyboards
  and hosted behavior were not tested.
- Final diff, staged whitespace and complete task review passed. Final fetch
  confirms the branch contains current `origin/dev` `bf472463`. No remaining local
  implementation blockers; normal GitHub PR CI and owner review remain pending.
- Next: review PR #27 and its CI; owner merges manually. Before rollout, follow
  `docs/deployment.md`: pause automatic deployment, drain play, obtain explicit
  authorization for live migration 006, coordinate Worker/backend cutover and prove
  actual Brevo/public-origin acceptance. No live migration, provider change or
  deployment occurred, and the reported production failure is not claimed fixed.
- Usage observed at 02:42 UTC: five-hour **38% remaining**, reset 2026-10-13
  05:23:57 UTC /12:23:57 Bangkok; weekly **27% remaining**, reset 2026-10-18
  05:12:40 UTC /12:12:40 Bangkok. No billing/reset-credit action.

---

## Account email codes — implementation plan, 2026-10-13 08:48 Bangkok (01:48 UTC)

- Owner requested implementation of the written spec; treat that as written-spec
  approval, including its technical defaults. Clean branch
  `codex/account-email-codes` created from freshly fetched `origin/dev` `bf472463`.
  Last completed application baseline is that merge; no product changes yet.
- Completed repository/provider inspection and the self-reviewed executable plan
  `docs/superpowers/plans/2026-10-13-account-email-codes.md`. Dedicated persistent
  challenges preserve Better Auth sign-in/session authority while providing durable
  attempt/rate controls, atomic reset and legacy-route retirement. Five tasks cover
  database/backend, native auth/email, UI, fixtures/browser acceptance and handoff.
- Pending: owner review of the concrete plan and selection of native or subagent
  execution, explicitly required by the writing-plans skill. Native is recommended.
  Next: after review, read the executing-plans and test-driven-development skills,
  fetch origin, recheck usage, then execute Task 1 on this same branch.
- Plan/doc accuracy reviewed against current routes, provider source, migrations,
  manifests, CI and test fixtures. Application tests, hosted diagnosis, real Brevo
  acceptance, deployment and live migrations have not run. Documentation checks
  passed: `git diff --check`, staged whitespace checks, complete task diff review
  and branch whitespace checks. Plan commit `1f241ea4` is pushed in draft
  [PR #27](https://github.com/24-HUB/poker-game/pull/27), base `dev`; owner merges
  manually. Final fetch confirms the branch contains current `origin/dev`.
  Normal PR CI and plan approval remain pending.
- Usage observed 2026-10-13 01:48 UTC: five-hour 94% remaining, reset
  2026-10-13 05:23:57 UTC /12:23:57 Bangkok; weekly 36% remaining, reset
  2026-10-18 05:12:40 UTC /12:12:40 Bangkok. No billing or usage-reset action.

---

## Account email codes — spec review, 2026-10-12 21:42 Bangkok (14:42 UTC)

- Clean task branch `codex/auth-code-spec` from freshly fetched `origin/dev`
  `4c6b39b3`. User requested grill-me and i-have-adhd before a written spec.
  Interview choices: six-digit codes for verification/reset, 10 minutes, resend
  replaces old code, password sign-in after verification/reset, one reset form,
  reset also verifies email, and old-link retirement.
- Draft `docs/superpowers/specs/2026-10-12-account-email-codes.md` separates approved
  product choices from proposed five-attempt, cooldown/rate and storage controls.
  It requires whole-operation atomicity, durable failed-attempt accounting,
  concurrency/rollback evidence, no automatic login or OTP-route bypass, generic
  request responses and coordinated legacy-route retirement.
- Repository/provider inspection completed: pinned Better Auth 1.7.6 has OTP
  support and atomic consume, but whole-operation updates and race/counter safety
  require new tests. Existing link-reset transaction wrapper covers a different
  route. No application code, credentials or provider/live-data settings changed.
- Reported production link failure remains undiagnosed. Application tests,
  real-email/public-origin acceptance, deployment and migrations were not run.
  Complete document/diff review against the inspected code and confirmed choices,
  plus `git diff --check` and staged diff checks, passed. Application tests are
  unnecessary for this documentation-only diff. Specification commit `786237ec`
  is pushed in draft [PR #26](https://github.com/24-HUB/poker-game/pull/26), base
  `dev`. The final fetch confirms the branch contains current `origin/dev`;
  normal PR CI and written-spec approval remain pending.
- Next: owner reviews the draft spec; after approval, write the executable
  implementation plan before product code. Production work needs separate
  authorization. Owner merges the documentation PR manually.
- Usage observed 14:42 UTC: five-hour 86% remaining, reset 2026-10-12 18:58:12 UTC
  /2026-10-13 01:58:12 Bangkok; weekly 42%, reset 2026-10-18 05:12:40 UTC
  /12:12:40 Bangkok. No usage reset or billing action.

---

## Automatic Render deployment — 2026-10-12 21:15 Bangkok (14:15 UTC)

- User requested automatic Render updates. New clean branch
  `codex/render-auto-deploy` from fetched `origin/dev` `0975b321` after PR #24 merge.
  Configure `autoDeployTrigger: checksPass`; the existing GitHub CI runs on `dev`
  pushes. No new deploy workflow or provider credentials required.
- Preserve manual owner PR merge and document native Blueprint sync, schema-change
  deployment pause, live migration prerequisites and active-play drain. Cloudflare
  automation remains separate. No live deployment, provider update or Atlas operation.
- Baseline assertion failed as expected (`off` instead of `checksPass`). Final
  YAML/CI parsing and semantic comparison passed: only the deployment trigger
  changes, `dev` remains linked and has push CI with `pnpm check`. Complete task
  diff review and `git diff --check` passed. No application code changes or local
  application tests rerun. Normal PR CI and hosted auto-deploy evidence pending.
- Implementation commit `a4b8ac7e` is pushed in draft
  [PR #25](https://github.com/24-HUB/poker-game/pull/25), base `dev`.
  Next: inspect final-head CI, then owner reviews/merges manually and confirms
  Render's synced setting is **After CI Checks Pass** for `dev`.
- Usage observed at 14:15 UTC: five-hour 96% remaining; weekly 44% remaining.

---

## Render Free Blueprint validation fix — 2026-10-12 19:49 Bangkok (12:49 UTC)

- Clean task branch `codex/render-free-blueprint` from fetched `origin/dev`
  `1bb1b639`. Render's operator screenshot rejects explicit
  `maxShutdownDelaySeconds` on Free; local configuration inspection reproduced
  that incompatible pair before the fix. Remove the field and use Render's
  default shutdown period. Document the limitation in `docs/deployment.md`.
- Implementation commit `78b655ba` is pushed in draft
  [PR #24](https://github.com/24-HUB/poker-game/pull/24), base `dev`.
  YAML parsing and semantic comparison passed: removing the unsupported field
  is the only service configuration change. Full diff review and
  `git diff --check` passed. The first comparison attempt was blocked by Node
  child-process permissions; rerun with Git output piped to Node passed.
  Application tests were not rerun for this provider-only field removal.
- Hosted Blueprint validation and normal PR CI remain pending; keep draft until
  required evidence is available. Next: inspect PR checks, manually merge the
  corrected revision into `dev`, refresh the operator's Render Blueprint setup
  and confirm validation before provisioning/deployment.
- Usage observed at session start: five-hour 85% remaining (reset 2026-10-12
  13:52:41 UTC /20:52:41 Bangkok); weekly 47% remaining (reset 2026-10-18
  05:12:40 UTC /12:12:40 Bangkok). No provider/deployment/live database/billing action.

---

## Local test account password login — 2026-10-12 11:31 Bangkok (04:31 UTC)

- User requested normal email/password login for prepared local users and removal
  of shortcut buttons. New clean task branch `codex/local-test-login` from freshly
  fetched `origin/dev` `66b36fcc` (PR #21 merged). Implementation **`d66e6f2d`**;
  draft [PR #22](https://github.com/24-HUB/poker-game/pull/22), base `dev`.
- Removed local shortcut UI/components, its `NEXT_PUBLIC_` flag and both mock-login
  HTTP endpoints. The disposable loopback harness still creates verified native
  Host/Guest accounts. Generated email/password pairs are saved only in ignored
  `apps/web/.artifacts/local-test-accounts.json`, outside public assets, with owner
  file permissions where supported. No credentials or session cookies in commits,
  HTTP responses, program logs or PR descriptions. Passwords rotate on fresh launch.
- Acceptance signs in through normal forms in separate contexts, joins a room and
  verifies sign-out/re-sign-in identity. Old endpoints and credential-file URL return
  404. The old-running harness demonstrated expected failures (200 shortcut and
  missing credential file), followed by **19/19 full Chromium passing, zero retries**.
  Initial test-loader error was corrected before behavioral evidence was recorded.
- Frozen pnpm 10.33.0 installation and aggregate `pnpm check` pass: **381 tests**, all
  types and production builds. Two obsolete shortcut component tests were removed.
  Read-only review found no major issues; its password-trace-retention minor was
  fixed by disabling tracing specifically for the local credential acceptance test.
  Existing backend restart helper/parser and account preparation checks are intact.
- Next: inspect exact documentation-head CI and keep the PR draft if it fails;
  restart the isolated preview, provide current local credentials to the owner,
  confirm fresh fetch/clean status, then hand off for manual review/merge. No auto
  login into the owner's browser. No production auth/deployment/live-data/billing
  changes. README explains normal login and the ignored credential path.
- Usage observed before final verification: five-hour 49% remaining, reset
  2026-10-12 08:14:49 UTC (15:14:49 Bangkok); weekly 55%, reset
  2026-10-18 05:12:40 UTC (12:12:40 Bangkok). No reset credit or billing action.

---

## M5.1a room UI refinement — 2026-10-12 11:02 Bangkok (04:02 UTC)

- User requested a second room pass after trying the live preview. Continue the
  existing `codex/m5-predeploy-ux` task and [PR #21](https://github.com/24-HUB/poker-game/pull/21)
  (base `dev`), returned to draft while this follow-up is verified. Last completed
  implementation commit **`a1bc9fa4`** follows baseline `4ed3f977`; fetch succeeded,
  `origin/dev` remains `623749f0`.
- Visible equipped/default portraits at all seats/mobile, acting-seat deadline
  ring and explicit label, readable dealer/blind/chip markers, larger private cards,
  optional four-colour suits, dashed undealt board slots and reduced-motion-aware
  card arrival. Fold/Call-or-Check/Raise always keep their positions; amount controls
  collapse off turn, raises are solid cobalt, presets outlined and server-clamped.
  Half-pot/pot sizing includes the call first; presets never submit a command.
- Lobby button confirms active-room departure. Gear options retain session end,
  deliberate collection/invitation departure and suit preference. Mobile playing
  title is hidden as requested; desktop title is compact. A single felt frame,
  safe-area padding and clearer cosmetic-ticket eligibility replace clutter.
  The local Next dev badge is disabled using its documented setting.
- Previous committed result is shown only for its matching live hand, or the final
  numbered hand of an ended session; it is dismissible and disappears at a new
  hand. Regression caught and fixed the ended-session live-ID-clearing case; the
  final public showdown comes from the selected committed result, not a cleared
  live-card field.
  Private-card projection, persistent economy and game authority are unchanged.
- Focused tests **29/29** pass. Core requirements first failed 5 tests, then passed;
  final-result/showdown regressions also proved RED→GREEN. Server/browser clock-skew
  coverage catches the atomic time-sampling issue. Frozen installation and aggregate
  `pnpm check` passed **383 tests**, typechecks and production builds. Final web
  test/build after the showdown follow-up passes **116 tests** and production build.
  Production chunks contain no mock UI/helper strings.
  Mechanical layout scan returned no findings; reviewer found no major product
  defect, and stale visible-text assertions were updated to accessible labels.
- Real six-player captures were inspected together at 360×800, 1280×720 and 900×900,
  then confirmed once after the waiting-row/result fix. Cards, avatars, 12px seat
  labels, pot/bet separation and primary controls pass original viewport bounds.
  Full Chromium run: **18 passed, 1 failed** on a legacy observer-Check absence
  assertion; updated to verify disabled authority instead. Final release rerun
  **2/2** passed including takeover and **4.5:1** control contrast, at zero retries.
  New-head Linux CI is pending. Do not call this ready to merge yet.
- Next: push these reviewed task-owned commits and inspect exact-head CI. Restart the
  disposable preview afterward. Browser control of the old preview tab was rejected
  by its URL policy; no browser-policy workaround was attempted. Isolated acceptance
  captures remain under `apps/web/.artifacts/room-refinement-final/`.
- Usage observed before aggregate verification: five-hour 69% remaining (reset 2026-10-12
  08:14:49 UTC /15:14:49 Bangkok); weekly 58% (reset 2026-10-18 05:12:40 UTC /
  12:12:40 Bangkok). No deployment, live database, email delivery or billing changes.

---

## M5.1a final acceptance — 2026-10-12 10:12 Bangkok (03:12 UTC)

- Task branch `codex/m5-predeploy-ux`, [PR #21](https://github.com/24-HUB/poker-game/pull/21), base `dev`.
  Latest verified implementation/test commit **`2f73ba30`** passed
  [Linux CI](https://github.com/24-HUB/poker-game/actions/runs/38198327488): frozen
  install, backend build, disposable MongoDB/replica setup, migration idempotency,
  **374 aggregate tests**, typechecks/production builds, encrypted backup/isolated
  restore, Worker packaging and **19/19 Chromium cases with zero retries**.
- Docker containers are healthy. Local collection recovery passed three unchanged
  repeats plus the diagnostic run; web typecheck and whitespace review passed.
  The intermittent prior Linux collection failure remains recorded below with
  cause unproven. Diagnostic assertions require a valid committed receipt and
  report only HTTP codes/named UI states; no product fix or relaxed timeout claimed.
- The final documentation commit changes no executable files. Inspect its normal
  CI before marking the PR ready, then fetch and verify branch freshness/clean status.
  Last fetched `origin/dev` is `623749f0`, included by the task branch.
- Next: owner reviews/merges manually once final-head checks pass. Deferred minor:
  cached history remains after a permission-denied refetch. M5.2/M5.3 hosted and
  provider work still requires operator inputs/authorization. No deployment,
  production database, email delivery or billing action occurred.
- Usage last observed: five-hour 20% remaining, reset 2026-10-12 03:14:47 UTC
  (10:14:47 Bangkok); weekly 64%, reset 2026-10-18 05:12:40 UTC (12:12:40 Bangkok).

---

## M5.1a collection recovery investigation — 2026-10-12 10:03 Bangkok (03:03 UTC)

- Continue `codex/m5-predeploy-ux`, draft [PR #21](https://github.com/24-HUB/poker-game/pull/21), base `dev`.
  Last completed commit is `d442a329`; fresh fetch contains `origin/dev` `623749f0`.
- Application commit `6f358fa1` passed all Linux checks below. The Markdown-only
  `d442a329` rerun passed all preceding checks but Chromium finished **18/19**:
  collection recovery did not show its final reveal within the original five-second
  assertion. [Failed run](https://github.com/24-HUB/poker-game/actions/runs/38197017820).
  Its cause remains unproven; do not describe the current PR as ready to merge.
- Fresh Docker services work. Three unchanged local collection repeats passed
  **3/3**, with zero retries. Added test-only diagnostics: require HTTP 201 and a
  strict committed receipt before reload, then report only recovery status codes
  and named UI states on failure. No timing relaxation or speculative product fix.
  Web typecheck and the diagnostic collection browser run **1/1** passed.
  New-head CI is pending.
- Next: commit/push these reviewed task-owned test/docs changes and inspect new-head CI.
  Keep the PR draft if it fails; investigate the reported recovery state.
- Usage at investigation start: five-hour 24% remaining, reset 2026-10-12
  03:14:46 UTC (10:14:46 Bangkok); weekly 65%, reset 2026-10-18 05:12:40 UTC
  (12:12:40 Bangkok). No deployment, live database or billing action.

---

## M5.1a verified implementation — 2026-10-12 09:41 Bangkok (02:41 UTC)

- Completed Tasks 1–4 on `codex/m5-predeploy-ux`, existing
  [PR #21](https://github.com/24-HUB/poker-game/pull/21), base `dev`.
  Verified application commit **`6f358fa1`** follows `f7619764` and `2f09c749`.
  Final fetch succeeded; this branch contains current `origin/dev` **`623749f0`**.
- [Linux CI run](https://github.com/24-HUB/poker-game/actions/runs/38196054989)
  passed on `6f358fa1`: frozen installation, uncached backend build, replica-set
  setup, migration idempotency, **374 aggregate tests**, types/production builds,
  encrypted backup/authenticated restore rehearsal, OpenNext Worker packaging and
  **19/19 Chromium cases with zero retries**. The mobile geometry assertion remains
  at 360×800 and controls fit above 800px; desktop 1280×720 also passes. No weakened gate.
- Local evidence: aggregate 374; native history HTTP guard 18/18; boundary 7/7;
  table 9/9; action panel 9/9; full CI-mode Chromium 19/19 before final timer grouping;
  final scoped capture flows and isolated reconnect pass. Final captures in
  `apps/web/.artifacts/ux-linux-followup/` were inspected, including actual mobile
  own turn and waiting state. Production chunks contain no mock UI/helper strings.
- Fixed compact layout, stable caller marker, initial-authentication form reset,
  and Linux font-sensitive overflow by giving the title its own row and keeping
  the timer beside one turn label. Observer actor context and private-card/control
  rules remain intact. Earlier Windows socket-buffer failure and historical restart
  diagnostics are preserved below; no production restart/network fix is claimed.
- Fresh read-only review reported no Important/Critical findings; remaining minor
  is retained cached history after a refetch permission error (already-received
  client data, not new server disclosure). Owner review/merge remains manual.
- This final documentation follow-up records the completed gates; only Markdown
  changes follow the verified application commit. Review its diff and
  `git diff --check`; its normal GitHub workflow may run again. Do not change code
  or rerun completed implementation merely because a documentation commit follows.
- Next: user reviews/merges PR #21 manually. M5.2 storage destination/key access and
  M5.3 hosted acceptance require the operator's inputs and separate authorization.
  No deployment, live database, email delivery or billing changes occurred.
- Usage observed before handoff: five-hour 35% remaining, reset 2026-10-12 03:14:47 UTC
  (10:14:47 Bangkok); weekly 67%, reset 2026-10-18 05:12:40 UTC (12:12:40 Bangkok).
  No reset-credit or billing action.

---

## M5.1a resumed local verification — 2026-10-12 08:58 Bangkok (01:58 UTC)

- Continued clean `codex/m5-predeploy-ux` and existing
  [PR #21](https://github.com/24-HUB/poker-game/pull/21), base `dev`; fetched
  `origin/dev` remains `623749f0`. Preserve prior implementation `f7619764` and
  checkpoint `032f885c`. No deployment, live database, billing or unrelated changes.
- Fixed the recorded layout blockers: compact app/room headers, stable control
  placement without bottom-sticky overlay, preserved card sizes, and enough room
  between the center pot and inward bets. Long names truncate independently of the
  always-visible `(you)` marker. Numeric input/slider/presets retain legal behavior.
- New real-browser geometry assertions first failed on mobile overlap and then
  1280×720 overflow; they now pass for waiting and actual own-turn mobile panels,
  desktop/tablet, private-card visibility and pot/bet separation. These assertions
  run in CI, not only during screenshot capture. Final six-player captures are
  local/ignored under `apps/web/.artifacts/ux-completed/`; mobile own turn, 1280×720,
  900×900 and 1440×1000 were inspected. No exhaustive accessibility certification.
- Full Chromium under `CI=true` passed **19/19, zero retries**. A prior resumed
  run passed 18/19 and exposed an initial-authentication form reset: lobby controls
  were clickable before session resolution, then the membership check remounted
  the form. The boundary now withholds interactive destinations during initial
  loading; the regression proved RED→GREEN. Existing recovery/account-isolation
  coverage remains passing (boundary 7/7; table 9/9).
- The previous restart-after-game failure did not reproduce with fresh Docker
  services: isolated sequence 3/3 and both resumed full browser runs passed restart
  recovery at the original bounds. Temporary harness timing showed lease expiry in
  4–9 ms and prompt relaunch; diagnostics were removed. No production restart fix
  is claimed, and the original historical cause remains unproven. Earlier failures
  during this resumption were Docker-startup setup failures, not acceptance results.
- Frozen install used pnpm 10.33.0. Final local `pnpm check` passed **372 tests**,
  typechecks and production builds. A further native HTTP history guard test passed
  with server typecheck and identity suite **18/18**: outsider 403, malformed cursor 400,
  anonymous 401 and revoked 401. Rebuilt production chunks contain no mock UI/helper
  strings. Global pnpm outside the workspace is 12.6.0; the documented Windows wrapper
  selects 10.33.0. Next's generated type imports returned to unchanged production form.
- Mechanical layout detector returned no findings. Fresh read-only review found no
  Important/Critical findings. Deferred minor remains: cached hand outcomes stay
  visible after a refetch authorization error; this is already-received client data,
  not a new server disclosure. Hosted playtest/provider gates remain separate.
- Follow-up implementation `2f09c749` was pushed. Its Linux CI passed aggregate,
  backup rehearsal and Worker packaging; Chromium finished 17 passed, 1 failed and
  1 skipped. The new mobile assertion exposed a panel bottom of 828px in an 800px viewport.
  Kept the original viewport gate: remove redundant turn labels, keep timer beside
  the mobile turn label, and give the room title its own grid row rather than sharing
  width with options. Actor context remains visible for observer/transport states.
  The semantic turn-label regression proved RED→GREEN. New-head Linux CI remains
  required before declaring this PR ready; record its evidence before final handoff.
- Correction verification: the semantic turn-label unit suite passes 9/9; full local
  CI-mode Chromium passed 19/19 before the final mobile timer-grid grouping. The
  final poker/history/six-player capture flows passed; one reconnect capture attempt
  failed before the server on Windows `net::ERR_NO_BUFFER_SPACE`, confirmed from
  the local trace. Its isolated rerun passed unchanged at the original bound. Scoped
  final mobile own-turn/waiting captures were inspected. Latest `pnpm check` passed
  **374 tests**, types and production builds. No unrelated application/network fix
  was introduced for the host socket-buffer failure.
- Next: inspect the new GitHub CI run after push. If it fails, read its actual failed
  step/logs and repair the cause on this same branch; do not relax acceptance bounds,
  merge, deploy or create another implementation branch. User merges manually.

---

## M5.1a implementation save point — 2026-10-11 13:32 UTC

- Task: implement the newly merged pre-deployment UX plan, Tasks 1–4. Clean start
  and fetch succeeded; branch `codex/m5-predeploy-ux` starts at `origin/dev`
  `623749f0` (merged planning PR #20). No unrelated work, deployment, live database
  or billing changes. Final fetch succeeded and the base remains `623749f0`.
- Implemented: authenticated no-store current-room lookup and active navigation
  recovery/explicit destination leave; waiting-room Return entry; compact poker
  table with stable caller-relative seats, authoritative hand/blind/current-bet
  metadata, legal amount input/slider/presets and duplicate submission protection;
  member/participant-only paginated committed history; selectable/copyable secure
  invite codes; two verified native mock accounts in the disposable loopback harness;
  accurate sign-in 403/429 mapping and documented pinned Windows launcher.
- Evidence: initial frozen installation and `pnpm check` passed types, tests and
  production builds. Focused server rooms 23/23, identity HTTP 17/17 and expanded
  poker 20/20 passed; boundary regressions 6/6 passed. Final poker/history/release
  Chromium 3/3 passed with zero retries, including actual history schema validation
  after reload, six-player unequal all-ins/chip conservation and heads-up reconnect/
  takeover. Separate mock/restart/accessibility run passed 4/5 (both native mock
  cases and both restart cases); accessibility was corrected to await authenticated
  UI and passed in the later full run. Collection and both room browser cases passed
  in the focused gameplay batch. These separate runs do not constitute full-suite GREEN.
- Review: one fresh read-only reviewer found stale waiting snapshots masking play
  and null membership clearing an uncertain leave. Polling now reconciles phase only
  against an unchanged room snapshot; pending leave survives null polling for explicit
  command reconciliation. Regression tests pass. The initially successful history
  HTTP response contained Mongo-mutated reward receipt `_id`; explicit nested public
  projection fixed it and real browser/schema regression now passes.
- Remaining blockers: (1) at 360×800 the bottom-sticky action panel overlays lower
  seats/private cards; (2) at 1280×720 actions extend below the viewport; tighten
  header/layout and preserve card visibility, add actual viewport/non-overlap assertions;
  (3) full suite's backend restart after active-room gameplay returns 502 and misses
  its 5-second recovery bound, cascading to later tests. Isolated active-room + restart
  reproduced 1 failure/2 passes; restart + mock without prior gameplay passed.
  Local diagnostic cleanup of the latest disposable database eventually passed but
  was delayed; root cause is unproven. Do not mask it by relaxing bounds or claiming
  a production fix. Linux Worker CI and full `CI=true` Chromium remain pending.
- Visual evidence is local/ignored at
  `apps/web/.artifacts/ux-captures/release-six-players-settle-c4946-d-keep-mobile-cards-private-chromium/`.
  Inspected 360×800, 900×900, 1280×720 and 1440×1000 hand captures. No exhaustive
  accessibility claim. Reviewer minor deferred: history retains cached outcomes on
  a refetch permission error; assess hiding them without claiming server data leakage.
- Final `pnpm check` passed **370 tests**, all configured typechecks and production
  builds after correcting a test-only CommonJS/ESM import. No lint script exists.
  Rebuilt production chunks contain no `LocalMockAccounts`, `Play as Mock` or
  `/__e2e/mock-login` strings. `git diff --check` and staged diff check passed;
  build regenerated Next development imports back to the unchanged production file.
- Implementation commit **`f7619764`** is pushed on `codex/m5-predeploy-ux` in
  **draft [PR #21](https://github.com/24-HUB/poker-game/pull/21)**, explicitly targeting
  `dev`. This documentation follow-up records the save point. The user merges
  manually; no required UX gate is complete. No task-owned application changes
  remain uncommitted after this follow-up is saved.
- Resume: check usage/status, fetch origin, remain on this task branch and read this
  save point. Fix responsive blockers first, then run
  `npm.cmd exec --yes --package=pnpm@10.33.0 --call "set npm_execpath=&& pnpm --filter @poker/web exec playwright test tests/e2e/poker.spec.ts tests/e2e/release.spec.ts --output=.artifacts/ux-captures"`.
  Inspect screenshots and add mobile overlap/1280×720 viewport assertions. Diagnose
  restart with `playwright test tests/e2e/active-room.spec.ts tests/e2e/backend-recovery.spec.ts`
  via the same pinned pnpm invocation, then full `CI=true` Chromium and `pnpm check`;
  regenerate production types after dev harness exits and update this existing PR.
- Usage observed 2026-10-11 13:32 UTC: five-hour **9% remaining**, reset
  2026-10-11 15:49:58 UTC; weekly **81% remaining**, reset 2026-10-18 05:12:40 UTC.
  This is a save point due to the repository's below-10% rule, not task completion.

---

## Detailed poker-room UX/UI specification added — 2026-10-11 12:13 UTC

- Resumed clean `codex/predeploy-ux-plan` on draft
  [PR #20](https://github.com/24-HUB/poker-game/pull/20), base `dev`;
  previous handoff commit `0b0ac710` is preserved. Start fetch succeeded.
- Saved the full user specification in `docs/superpowers/specs/2026-10-11-poker-room-ux-ui.md`
  and expanded M5.1a Task 2 with layout, stable seats, authoritative metadata,
  legal amount input/slider/presets, submission states, bounded committed history,
  desktop/tablet/mobile acceptance and accessibility. Task 1 now retains destinations
  via a deliberate leave flow; confirmation is limited to active-hand consequences.
- Planning only: no application/database/deployment changes. Earlier gameplay
  evidence does not verify this specification; all implementation steps stay unchecked.
- Specification/plan commit `76020ee7` is pushed to PR #20; its description now
  covers the full specification. This checkpoint follow-up records the handoff.
  Final fetch succeeded; the branch contains current `origin/dev` `fc6cb0dc`.
- Documentation verification passed: reviewed the complete five-file follow-up diff
  and coverage of spec sections 1–9, checked data requirements against current engine/
  contracts/projection/persistence, balanced Markdown fences and all 20 local link
  targets, and passed `git diff --check`. Application tests were not rerun for prose.
- Next: review/merge PR #20 manually, then implement M5.1a Task 1 when requested,
  beginning with clean status/usage/fetch checks. Provider accounts, backup storage/key
  access and hosted authorization remain pending.
- Usage observed 2026-10-11 12:13 UTC: five-hour 65% remaining (reset
  2026-10-11 15:49:58 UTC), weekly 90% remaining (reset 2026-10-18 05:12:40 UTC).
  Handoff observation 12:17 UTC: five-hour 61%, weekly 89% remaining, same reset
  times. No billing/reset action occurred.

---

## Pre-deployment UX plan update — 2026-10-11 12:03 UTC

- Branch `codex/predeploy-ux-plan`, clean start from freshly fetched `origin/dev`
  `fc6cb0dc`. The user explicitly authorized restoring the sole generated
  `apps/web/next-env.d.ts` development-type change before branching. No unrelated
  work was discarded; no application code, credentials, database or deployment changed.
- Added M5.1a to the existing implementation plan: authoritative current-room
  recovery and active navigation lock; clear table/actions/control states; code-only
  invitations preserving token security; two ready local players without manual
  registration/verification. Included the observed incorrect sign-in 403 message
  and verified Windows pnpm launch path as acceptance regressions.
- Added matching release blockers and confirmed requirements to plan.md. Earlier
  passing M5.1 evidence remains historical; all new implementation steps are unchecked.
  The new scope must pass before the next hosted candidate and M6 production approval.
- Documentation-only validation passed: referenced paths/scripts were checked against
  the repository, all 15 local documentation link targets exist, Markdown fences
  are balanced, and the complete four-file diff and `git diff --check` were reviewed.
  Application tests were not rerun for these prose-only changes.
- Planning commit `0f7f807c` is pushed in draft [PR #20](https://github.com/24-HUB/poker-game/pull/20),
  targeting `dev`; this documentation follow-up records the handoff. Final fetch
  succeeded and the branch contains current `origin/dev` `fc6cb0dc`.
- Next: inspect PR #20's final-head CI and review/merge the plan manually. After
  merge and an implementation request, start M5.1a Task 1
  with clean status/usage/fetch checks. Provider accounts, encrypted storage/key
  access and hosted authorization remain pending; no new deployed evidence is claimed.
- Usage observed 2026-10-11 12:03 UTC: five-hour 76% remaining (reset
  2026-10-11 15:49:58 UTC), weekly 91% remaining (reset 2026-10-18 05:12:40 UTC).
  Handoff observation 12:08 UTC: five-hour 70%, weekly 90% remaining, same reset
  times. No billing/reset action occurred.

---

## M5.1 multiplayer gameplay acceptance — 2026-10-10 07:17 UTC

- Resumed `codex/m5-gameplay-acceptance` from `origin/dev` `5decc3eb` (PR #17 merged), preserving its unfinished `release.spec.ts`. Implementation `d4c2373c` is committed and pushed; draft [PR #18](https://github.com/24-HUB/poker-game/pull/18) targets `dev`. Fetch succeeded at start and during verification; the branch contains current dev. This documentation follow-up records the handoff. The user merges manually.
- Completed the bounded local gameplay slice: real six-account unequal all-ins with 6,000 conserved chips, private cards, readable side pots, results after reload, and heads-up disconnect/reconnect plus old-tab takeover rejection. Disconnect updates now publish after durable room changes through the authorized recipient publisher, inside shutdown draining. Result projections retain engine-settled pots both before and after clearing the hand; uncalled returns are excluded. Live contributions show a single total until settlement. Felt text's conservative gradient contrast improved from 4.11:1 to 5.04:1.
- RED/GREEN evidence: ended-session pots were empty; committed fold results incorrectly included a returned 10-chip side pot; real Socket.IO disconnects did not publish a disconnected member; browser felt contrast failed at 4.106. Each failed before its correction. Focused server poker 17 cases and gateway 14 cases are covered by the passing aggregate; table unit cases pass 6/6.
- Verification: frozen pnpm 10.33.0 install; `pnpm check` passed 327 tests (192 server, 70 web, 15 contracts, 18 engine, 29 economy, three scripts), all typechecks and configured production builds. No lint script exists. Focused browser flows passed 2/2 and three subsequent rounds under `CI=true` passed 6/6 with zero retries. Final `CI=true pnpm --filter @poker/web test:e2e` passed 16/16, zero retries. Final `pnpm --filter @poker/web exec next typegen`, web typecheck and `git diff --check` passed after browser shutdown; generated imports match the committed production paths.
- Browser investigation: absent Fold locators could consume waits; covering stacks correctly retain chips rather than always becoming all-in; keyboard focus is exercised using Tab rather than programmatic focus. An intermediate full run passed 14 cases, failed the six-player caller selector and skipped the following serial case. Atomic `evaluateAll` now removes the count/enabled race and retains sanitized phase/turn/control/pending diagnostics. The original failure's exact cause is unproven; no production timer or timeout change was made. Serial mode avoids cascading admission failures after an interrupted release case.
- Visual inspection: four local captures at 360×800 and 1440×1000 cover the six-seat hand and final results; all cards, labels and standings fit without horizontal overflow. Keyboard raise has a visible outline and a target at least 44×44; reduced-motion context is exercised. Captures/logs remain ignored and are not uploaded; these focused checks are not an exhaustive accessibility certification.
- Review: independent read-only reviewer found the committed-result uncalled-return issue, then confirmed the regression/correction and found no remaining actionable issues. Reviewer did not run tests; implementer owns execution and screenshot evidence.
- Pending at checkpoint creation: this documentation follow-up only; commit/push it to the same branch/PR and fetch before final handoff. Exact resume step: inspect final-head PR #18 Linux/Worker/Chromium CI; investigate any failure using the retained diagnostics, without retries or guessed timeouts. Local M5.1 gameplay gates are complete. External encrypted backup destination/budget/key access and authorized hosted playtest remain pending; do not repeat completed recovery tooling or deploy without specific authorization. Keep the PR draft pending candidate CI and the remaining release gates.
- Usage tools are unavailable in this session; remaining percentages/reset times cannot be reported. Observation time 2026-10-10 07:17 UTC; no billing/reset action occurred.

---

## M5.1 admission and maintenance controls — 2026-10-08 13:53 UTC

- Branch `codex/m5-maintenance-controls`, draft [PR #17](https://github.com/24-HUB/poker-game/pull/17), base `dev`. Implementation `c4462714` is committed and pushed; this documentation follow-up records the handoff. Started from freshly fetched `origin/dev` `08e67c82`, which merged M5.2 PR #16. The only pre-existing change was Next-generated development type imports; the user authorized restoring it before the clean branch start. The user merges manually.
- Completed this bounded M5.1 slice: validated immutable server startup settings `ALLOW_NEW_SESSIONS` and `ECONOMY_WRITES_ENABLED`, closed by default in production and explicitly closed in the Render blueprint; global one-ACTIVE-session admission under the existing shared transaction fence; new pulls/equipment changes blocked without durable effects; committed start/purchase identities and account-owned receipt replay preserved; admitted hand/reward settlement and next-hand advancement remain available. Deployment and operations documentation explains operator restart/drain and complete writer shutdown for backups. No deployed settings, provider resources, live database, email or dependency changes occurred.
- RED/GREEN: initial real-replica run admitted both concurrent rooms and ignored gates (six new behavior failures; three compatibility cases already passed); configuration suite initially lacked its module. The corrected implementation passed 35 focused release/config/session/gacha/equipment tests. Expanded coverage passed 17 release/config cases, including real authenticated HTTP/Socket.IO, rollback, completion/abort capacity release, rejected browser overrides, lost commit acknowledgements and maintenance settlement/rewards. A first purchase-race probe waited on its own wallet inside an open transaction and timed out; stopped the identified test process, corrected the test account separation and reran without hangs.
- Verification: frozen install with pnpm 10.33.0; `pnpm check` passed 191 server, 68 web, 15 contract, 18 engine, 29 economy and three script tests (324 total), all typechecks and configured production builds. Final full Chromium under `CI=true` passed 14/14 with zero retries; focused restart repeats passed 6/6. Final production route type generation, web typecheck and `git diff --check` passed. No lint script exists. Linux/OpenNext Worker evidence for the final PR head remains CI work; no new UI layout was implemented, and expanded gameplay/visual acceptance remains unchecked.
- Browser investigation: first full run passed 13/14 because collection acceptance left its second session ACTIVE, so the following poker test correctly received `SESSION_LIMIT_REACHED`. The collection test now ends that session via the guest-host end request and current actor fold, waiting for durable standings before sign-out. A separate follow-up run passed collection/poker but failed backend restart's existing five-second lobby assertion while showing Service unavailable. Three focused repeats (6/6) and final full run (14/14) passed; its exact transient cause is not established. Fixed-state/HTTP-status diagnostics are retained without private data, added waits or retries. Do not describe that transient as a proven production defect or a proven fix.
- Review: fresh independent read-only review inspected the whole control slice and subsequently the browser cleanup/diagnostics; no actionable findings. Reviewer did not rerun tests or reproduce failover; implementer inspected execution results. Rulings: retain repository-mandated branch/PR workflow in the existing checkout (branch discipline supplies isolation); limit this slice to controls rather than claim full M5.1 (expanded gates stay pending); use startup settings and include equipment under the economy gate (operator restart may abort unfinished hands); reuse the authority fence instead of a migration/second lock (future writers must retain fencing); finish collection's test session through real controls (actor/host assumptions remain covered by the full suite). No deferred review minors.
- Freshness: fetched `origin` successfully after resolving the sandbox's Git write restriction; `origin/dev` remains `08e67c82` and is contained in this branch. [Merged dev CI](https://github.com/24-HUB/poker-game/actions/runs/37771118582) passed, resolving the user's pending-check observation. Inspect the final PR #17 head rather than infer its checks from dev or an earlier commit. Keep the PR draft while candidate CI or remaining release gates need evidence.
- Pending at checkpoint creation: this documentation follow-up only. Exact next handoff step: commit/push the checkpoint/docs to this same branch, fetch and confirm freshness, then inspect final-head PR #17 CI. On resume, run usage/status/branch/fetch checks and read this entry; investigate any actual CI failure with the retained diagnostics, without guessed timeouts or retries. Next implementation scope is remaining M5.1 two/six-player gameplay and visual/accessibility acceptance; external encrypted backup destination/budget/key access and M5.3 hosted actions remain separate pending gates. Do not repeat the completed local audit/restore or deploy without specific authorization.
- Usage observed 2026-10-08 13:53 UTC: five-hour 58% remaining (reset 2026-10-08 18:05:52 UTC), weekly 62% remaining (reset 2026-10-14 03:43:34 UTC). No reset credit used. Ignored local execution logs/diagnostics are not uploaded to CI or included in the PR.

---

## M5.2 local recovery tooling — 2026-10-07 12:45 UTC

- Branch `codex/m5-backup-rehearsal`, draft PR [#16](https://github.com/24-HUB/poker-game/pull/16), base `dev`. Implementation `9ec83a8e` is committed and pushed; this documentation follow-up records the handoff. Started clean from freshly fetched `origin/dev` `4d9fb000`, which merged M5.1 PR #15. The user merges manually.
- Completed local scope: read-only snapshot economy audit with explicit target selection and aggregate-only output; valid/corrupt replica-set fixtures; an encrypted `mongodump`/`mongorestore` drill in its own authenticated loopback replica set with separate scoped credentials; metadata/count comparison, real restored auth sign-in, receipt replay without debit, ownership/equipment checks. CI runs the audit and restore commands. `docs/operations.md` supplies backup/restore, rollback and five incident runbooks. No live data, provider resources, email or deployment operation occurred.
- Approved 2026-10-07: user is the operator; backup after sessions/before releases; retain seven recent successful session backups plus the latest pre-release backup until the next release is verified; tolerate loss since the last successful backup; recover within one operator-attended day. Encrypted external destination, storage budget and retained-key access remain pending; these approvals are targets, not measured hosted guarantees.
- Verification: frozen install with pnpm 10.33.0; corrected final `pnpm check` passed 174 server, 68 web, 15 contract, 18 engine, 29 economy and three existing script tests, all typechecks and configured production builds. No lint script exists. `pnpm test:backup` passed twice; final drill at 12:37:48 UTC restored in 862 ms, measured procedure 14,341 ms, zero fixture progression lost. Matching Database Tools 100.14.0; encrypted SHA-256 and initial/final timings are in operations.md. All collection metadata/counts matched. Encryption tampering was rejected; reader writes and cross-database access were rejected; temporary archive/container cleanup succeeded. JS syntax and `git diff --check` passed. No UI changed, so no new local browser/visual run was needed; candidate Linux/Worker/Chromium evidence remains CI work.
- RED/GREEN and review: missing audit initially failed 24/25 cases; after implementation the valid case exposed embedded MongoDB receipt `_id` fields, then a fractional daily aggregate regression exposed an unsafe integer conversion. Both were corrected. A fresh read-only reviewer found valid default equipment before wallet creation; its real-repository test failed, then passed after correction, and the whole aggregate was rerun green. Initial rehearsal failures were tmpfs directory ownership and runtime migration permissions; schema setup moved to the operator while runtime roles stayed scoped.
- Ruling: added repeatable authenticated rehearsal and CI integration beyond the plan's originally named files to preserve acceptance evidence; it adds a bounded Docker dependency to CI. Ruling on review limits: aggregate results and local timings/checksum were inspected by the implementer; live Atlas/tool permissions, retained storage/key access/budget, hosted loss/time, writer shutdown, outbound isolation, authority recovery and compatible deployed rollback remain unchecked gates. The audit cannot establish statistical fairness or recover entirely missing histories. Minor deferred: SSR eligible-pool exclusion auditing is outside this reference audit; existing gacha behavior coverage remains, and operations.md states the limit.
- [Implementation-head CI](https://github.com/24-HUB/poker-game/actions/runs/37623352933/job/112798842571) was in progress at 12:45 UTC. This docs-only follow-up triggers a new candidate run; inspect the final PR head. Keep PR draft while required checks or remaining recovery setup are pending. M5.1's unimplemented maintenance/admission and expanded visual gates are still unchecked; M5.3 deployment/hosted recovery requires its own authorization.
- Final freshness fetch succeeded: `origin/dev` remains `4d9fb000`, contained in this task branch. No upstream merge/rebase performed. This follow-up is the only task-owned pending change at checkpoint creation; commit/push it to the same branch/PR. Exact next step after handoff: inspect final-head PR #16 checks, then obtain the operator's encrypted destination/budget/key-access details and document the selection. Finish remaining M5.1 gates before proposing concrete M5.3 hosted actions. Do not repeat the completed local audit/rehearsal or restore over a live database.
- Usage observed 2026-10-07 12:45 UTC: five-hour 30% remaining (reset 2026-10-07 14:30:43 UTC), weekly 86% remaining (reset 2026-10-14 03:43:34 UTC). No reset credit used. On resume, inspect usage/status/branch, read this save point and plan.md, and fetch before implementation.

---

## M5.1 timer correction - 2026-10-07 12:00 UTC

- Continuing branch `codex/m5-release-gates`, draft PR [#15](https://github.com/24-HUB/poker-game/pull/15), base `dev`. Implementation correction `b614e003` is committed and pushed; prior CI/build implementation `f6b2577a` and save point `2db3aaef` remain in history. This documentation follow-up records the correction. The user merges manually.
- Completed: `SystemGameClock` reschedules early native callbacks until their original absolute deadline, preserving cancellation and unref behavior. Added five deterministic tests and non-waiting, sanitized collection timeout diagnostics. Browser sequence, 10-second readiness bound and zero retries are unchanged; speculative guest-handoff setup changes were removed.
- Concrete RED/GREEN evidence: 500 staggered native five-second timers produced 11 callbacks one millisecond early. Game deadline guards discard such callbacks without rearming. Two clock tests failed before the correction; the corrected five-case suite passed in the aggregate. A compiled fixed-clock probe produced zero early callbacks out of 500. This establishes the timer defect, not the exact cause of the earlier Linux collection failure, whose state was not captured.
- Verification passed on the correction: frozen installation; sequential `pnpm check` with 174 server, 68 web, 15 contracts, 18 engine and three script tests, typechecks and production builds; final web diagnostic typecheck; two complete Chromium runs under `CI=true`, 28/28 without retries. Focused review found no clock correctness issue; its minor diagnostic auto-wait finding was fixed. Production route imports were regenerated, no harness listeners remain, and no task-owned changes are pending outside this documentation follow-up.
- Earlier evidence/failures: Linux on `2db3aaef` passed all earlier gates and 13/14 browser tests, failing the collection actor wait. The proposed guest setup fix still failed one of three repeats and was withdrawn. An additional diagnostic run had one reveal timeout and three passes; the previous day's run had one pass and three worker crashes. Original-sequence diagnostics then passed six focused and 28 full repeated tests before the clock correction. An undeclared Jest import failed the first correction typecheck; it was corrected and the full aggregate rerun passed. Docker was initially unavailable this resume; after the user opened it, isolated services and replica initialization succeeded.
- [Linux CI on correction `b614e003`](https://github.com/24-HUB/poker-game/actions/runs/37617148673/job/112778136755) passed every configured step: frozen install, uncached backend, migration idempotency, aggregate, OpenNext Worker packaging, Chromium/system installation and full Chromium 14/14. This docs-only follow-up triggers another run; inspect its final head before manual merge. Keep PR draft while remaining M5.1 work is unresolved. No deployment, live email, Atlas/catalogue operation or dependency upgrade occurred.
- Fresh fetch succeeded; `origin/dev` remains `d0883bac`, contained in this task branch. Exact next step: inspect final-head PR checks; if they fail, use the sanitized actor diagnostics to investigate without retries or guessed timeouts. Once CI is green, continue this branch/PR with failing real-replica/transport tests for concurrent starts across rooms, retry-safe admission, blocked new purchases with unchanged balances and committed receipt replay during maintenance; implement validated server-only `ALLOW_NEW_SESSIONS` / `ECONOMY_WRITES_ENABLED` and one active session room under authority fencing. Expanded gameplay/visual, hosted/live email and restore gates remain unchecked.
- Usage observed 2026-10-07 11:59 UTC: five-hour 70% remaining (reset 2026-10-07 14:30:43 UTC), weekly 93% remaining (reset 2026-10-14 03:43:34 UTC). No reset credit used. On resume, inspect status/branch and usage, read this save point and `plan.md`, then fetch before further implementation.

---

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
