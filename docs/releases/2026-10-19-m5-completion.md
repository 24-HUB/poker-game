# Remaining M5 execution — 2026-10-19

## Task 1 preflight started — 2026-10-23 Bangkok

User requested execution after the named read-only Render/Cloudflare/Atlas/Brevo
preflight was explained. This authorizes current provider inspection, not mail,
account changes, deployment, gameplay, backup or fault execution. Work starts on
`codex/m5-hosted-preflight` from clean, freshly fetched `origin/dev` `a181a076`.
PR #37 is merged; its earlier draft/pending statements below are historical.

Current repository candidate: `a181a07658e55462d22ebbd29009436ff94e73af`.
[Merged-dev CI 39615760009](https://github.com/24-HUB/poker-game/actions/runs/39615760009)
and its [verify job](https://github.com/24-HUB/poker-game/actions/runs/39615760009/job/119276224168)
were inspected in GitHub and show success. The job includes frozen install,
uncached backend build, disposable migrations, aggregate checks, backup/restore
rehearsal, Worker build and full Chromium acceptance. PR #37 final run
[39615094415](https://github.com/24-HUB/poker-game/actions/runs/39615094415)
is also listed successful. No CI rerun or local application suite ran here.
The changes from `a76e51da` to this candidate are documentation only; this does
not establish the live provider binary or authorize a documentation-only deploy.

### Fresh observations and remaining entry conditions

| Surface | Observation | Remaining requirement |
| --- | --- | --- |
| GitHub | Merged candidate CI successful; authenticated browser available. Connector requests connection. | Preserve browser evidence; do not rerun CI merely for preflight. |
| Brevo | 300/300 daily emails left; one verified sender. Private comparison confirms configured backend sender matches. Sender name `pkgacha.support`; freemail/DKIM/DMARC compliance warning remains. | Delivery is unproven; preserve the warning and stop on delivery failure. No sender address is retained in Git. |
| Render | Human signed in. Free Singapore service, live deploy `dep-dbccv50473hc73ab35og`, commit `a181a076`. Auto-deploy After CI Checks Pass; Blueprint Auto Sync Yes on `dev`/`render.yaml`. | Keep these controls unchanged for read-only preparation; drain/restore only in a separately approved disruptive window. |
| Cloudflare | Human signed in. Active Worker `e4cfba62` at 100%, based on `0d4ae28a`; builds disabled, production branch `dev`, no cron/queue triggers or deploy hooks. Public/backend origins match the named pair; proxy secret remains encrypted. | Recheck before each window. No runtime source changes in web/server/contracts between the observed revisions; this source comparison supports compatibility, not a claim of artifact identity. |
| Atlas | Human signed in. Named FREE Cluster0 active, MongoDB 8.0.34; 143.78/512 MB (28%), backups/autoscaling off. `poker_playtest` has 25 collections/47 indexes. Temporary provisioning user and its dated temporary IP rule absent; current IP not allowlisted. | Existing Data Explorer supports projected reads. Do not renew direct access. Retained custom-role definition not re-inspected; user/rule absence does not claim deletion of that definition. |

The human completed the three provider sign-ins after the initial login blockers.
No credential, role, allowlist, expiry, configuration or game account was changed
by the agent. Render/Atlas plugins were discovered but are not connected; the
existing browser is the read-only path. Render usage: 18.7/750 instance hours,
39 MB/5 GB bandwidth and 12/500 pipeline minutes used. Cloudflare: 27/3,000 build
minutes this month and 4.36k requests October 1–23; these are observed dashboard
windows, not a daily request-quota certification.

### Projected account baseline and public smoke

At **21:39:47 Bangkok**, a read-only Data Explorer aggregation returned exactly
Playtest A and B, both verified. Each has one wallet, balance **0**, revision **0**;
no daily-earnings row for UTC 2026-10-23 (earned **0**, allowance **20** under v1).
For each, ownership, equipment, pull/reward receipts, ledger, banner progress,
active participants, active membership and non-left memberships are empty.
Global active participants/memberships are empty. Schema IDs **1–7**, catalogue
`celestial-v1`, hash `caab399fb53144bc13691265fb3e5e2e9b2c9d7bb9e53525d521cb9314a63324`.
One authority row is live at epoch **38**. No exact-name `Verification Probe C`
exists; other unverified accounts were not classified for reuse. The pipeline
excludes private identifiers, addresses, passwords, sessions and cards; it was
not saved to the shared query library. This is a projected baseline, not a
global transactional economy audit or fresh authenticated A/B browser session.

The first two bounded `node scripts/smoke-deployment.mjs` attempts returned shell
200 but failed because readiness was not JSON. Render logs then showed a cold
startup running pinned pnpm and `node dist/main.js`. Subsequent sanitized reads
returned direct `/health/deploy` 200 JSON `ok` and Worker `/api/health/ready` 200
JSON `ready`. The final normal smoke passed **shell 200 / readiness ready**.
The earlier expired epoch-37 lease became live epoch 38 after wake. This evidence
is consistent with cold startup; no application defect is established and no fix
was applied. Natural idle timing and the 90-second R1 bound were not certified.
Rollback deploy `dep-dbcccc3m8hqs73bnr2l0` (`a76e51da`) is listed successful;
its runtime source matches this candidate, but no rollback was executed.

### Proposed first executable packet: account/mail only

Targets: the named public Worker at `e4cfba62` and Render live deploy above,
Atlas `poker_g/Cluster0/poker_playtest`, and the privately matched verified Brevo
sender. Recheck artifact/flags, sender/quota, source baseline and no unrelated
participants at entry. Operator: the user; proposed window: **90 attended minutes
starting only after explicit approval and all private inputs are ready**. Record
actual start/end and approvals before execution; expiry ends the window.

Preserve A/B. Proposed C disposition: create one dedicated `Verification Probe C`
through normal signup with an operator-owned new alias, after confirming no
suitable unverified account should be reused. The human supplies inbox aliases,
passwords, registration code and email codes directly in the private forms.
Maximum **12 sends total / 4 each A/B/C**: nine planned (C verification three,
A reset three, B reset three), one explained delivery retry per alias. Follow
spec section 5's actual ten-minute expiry, at-least-60-second resend, supersession,
reuse rejection, post-verification password sign-in, old HTTP/socket revocation
and account-switch isolation sequences. Retain old contexts until revocation is
observed. Never start poker sessions, play hands, pull, equip, change providers or seed
progression as part of this packet.

Expected persistent effects: at most one new C account and its normal auth/wallet
initialization, bounded challenges/rate records/email, A/B password/session changes
performed by the human; A/B economy/progression stays unchanged. Stop on sender,
recipient, quota, artifact, delivery, revocation or progression mismatch, or any
unexpected participant/write. Do not compensate by recreating A/B or altering DB
records. Preserve diagnostics and uncertainty; sign out probes only after their
required revocation checks, recheck unchanged provider controls and record X1.

**Pending before this packet can run:** operator confirmation of A/B inbox
ownership, C reuse/new-account choice and owned alias entered privately, mail
distribution/window approval, human readiness and fresh entry checks. It is a
concrete proposed scope, not an active authorization. The other four packets
below retain these current resource/baseline pointers but still lack their own
required approvals/windows, legitimate purchase baseline or human participants.

### Dated evidence rows

| id | gate | candidate | environment | Bangkok timestamp | alias/operator | precondition | action | expected/observed invariant | result | evidence reference | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PRE-23-CI | P1 candidate | a181a076 | GitHub | 2026-10-23 21:24 | agent | clean fetched branch | read merged CI/job | success; no rerun | pass | CI/job linked above | preserve candidate binding |
| PRE-23-PROVIDERS | P1 inventory | a181a076 / e4cfba62 | named providers | 2026-10-23 21:30–21:41 | agent / human sign-in | read-only authorization | inspect artifacts, controls, quotas, access | inventory recorded; temporary direct access absent; no settings changed | pass | provider table above | recheck at window entry |
| PRE-23-BASE | P1 source baseline | a181a076 / e4cfba62 | Atlas Data Explorer | 2026-10-23 21:39:47 | A/B / agent | existing dashboard access | projected read-only aggregation | wallets 0/revision 0; no progression/membership; live epoch 38 | pass | projected baseline above | private inbox/C inputs; no global audit claim |
| PRE-23-COLD | P1 smoke attempts | a181a076 / e4cfba62 | public Worker | 2026-10-23 21:37–21:38 | agent | bounded GET smoke | first two readiness requests | shell 200; readiness not JSON | fail | smoke results/startup logs above | diagnose startup; keep R1 timing open |
| PRE-23-WARM | P1 smoke | a181a076 / e4cfba62 | public Worker / Render | 2026-10-23 21:39 | agent | startup observed | direct health then normal smoke | JSON health ok/readiness ready; normal shell 200/readiness ready | pass | sanitized diagnostic/normal smoke above | does not certify natural idle/R1 |
| PRE-23-METHOD | R2/R3 feasibility | a181a076 | Render Free | 2026-10-23 21:42 | agent | current tier/docs | evaluate distinct methods | no approved process-specific trigger/restoration | blocked | method matrix below | operator method/scope decision before F1 |

### Fault-method feasibility decision

[Render Free documentation](https://render.com/docs/free) was rechecked October 23:
Free excludes shell access and scaling beyond one instance. Its
[deployment documentation](https://render.com/docs/deploys) distinguishes restart
of the same commit/environment from a configuration deploy. These capabilities
do not supply a controlled process-specific fault method or current account state.

| Required variant | Missing method/evidence | Decision and exact next action |
| --- | --- | --- |
| R2 controlled stale-authority overlap | Named old/new processes, a controllable trigger that leaves the old process attempting a fenced write, independent commit proof, and bounded abort/restoration. Ordinary rolling deployment is insufficient. | **Blocked**. After service inspection, the operator must approve a feasible process-specific method or decide an explicit scope change; no drill is authorized by this record. |
| R2 settlement commit with lost acknowledgement | Named settlement request/process, selective acknowledgement suppression after independently observed commit, same-command recovery and restoration. The merged cosmetic-pull response runner proves a different G3 case. | **Blocked** pending that distinct method and window; do not count a lost pull response or ordinary restart as settlement evidence. |
| R3 runtime database loss | A process-local way to interrupt and restore DB access while the backend remains running, with no shared Atlas disruption; independent ledger/receipt audit and abort conditions. Startup DB failure is insufficient. | **Blocked** pending a safe method. Do not revoke shared credentials, alter shared Atlas networking, or add a public fault endpoint. |

P1 remains **in progress** until the relevant executable packet fields are
resolved; provider inventory and the A/B baseline are now observed. A1–X1 remain
open. No mail, password reset, signup, gameplay, purchase, deliberate restart,
backup or deployment ran. Next: obtain the first packet's missing human inputs
and named approval; recheck freshness before A1. R2/R3 stay blocked and prevent F1
and M5 closure, while independently approved earlier stages may proceed.

## Post-merge check and forward plan — 2026-10-21

PR #35 is merged as `a76e51da7a48daadb46b24d76697a88da0187475` on `dev`,
confirmed by a fresh origin fetch and GitHub's merged event. Its final head
`7fa334d4` has successful [CI 39611351308](https://github.com/24-HUB/poker-game/actions/runs/39611351308),
including the verify job's aggregate checks, backup, Worker packaging and full
Chromium suite. [Merged-dev CI 39611611127](https://github.com/24-HUB/poker-game/actions/runs/39611611127)
also completed successfully. No formal PR #35 reviews were displayed; earlier
PR #36 fix evidence is retained below. No local app tests were rerun for this check.

The [post-merge plan](../superpowers/plans/2026-10-21-post-merge-release.md) is now
the forward sequence. Existing detailed sequences/tooling remain authoritative;
the merge-first prerequisite is satisfied. Provider/config/account/mail freshness
and live gates are unchanged and open. No private provider/source action,
mail, gameplay, deployment or backup ran. Dated unmerged/pending statements below
are historical. Current planning branch: `codex/post-merge-release-plan`.

## Historical implementation handoff

Implementation requested for [PR #35](https://github.com/24-HUB/poker-game/pull/35).
The [specification](../superpowers/specs/2026-10-19-m5-completion-design.md) and
[plan](../superpowers/plans/2026-10-19-m5-completion.md) govern execution.
This approves preparation/local implementation; live packets below still need
their named approval, current inventory and human inputs. No live operation ran.

Branch: `codex/m5-operator-tools`, based on freshly fetched `origin/dev` `4f1e0e9b`.
Implementation: draft [PR #36](https://github.com/24-HUB/poker-game/pull/36),
executable commit `9f224b6e`. User merges manually.
PR #35 remains open/unmerged. Its two approved reference documents are included
on this branch so the implementation is reviewable directly against dev.
Merged-base [CI 39135639483](https://github.com/24-HUB/poker-game/actions/runs/39135639483)
rechecked completed/success on October 19. This does not certify new executable code.

## Evidence register

| id | gate | candidate | environment | Bangkok timestamp | alias/operator | precondition | action | expected/observed invariant | result | evidence reference | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PRE-01 | P1 | 4f1e0e9b | GitHub | 2026-10-19 20:32:07 | agent | current fetch | inspect merged CI | completed/success | pass | linked CI above | verify tool candidate separately |
| TOOL-01 | G3 method | working branch before 9f224b6e | disposable local | 2026-10-19 19:52:45 | synthetic accounts | local replica set | collection Chromium rehearsal | one committed pull, same receipt, single debit, equip/next hand/re-login | pass | existing collection.spec.ts using shared protocol | final code/full Chromium passed; live G3 remains gated |
| TOOL-02 | R4 method | 9f224b6e | Docker network none | 2026-10-19 20:23:18 | synthetic fixture | no source material | inspect namespace/mounts/routes/TCP | egress denied, unsafe configuration rejected | pass | restore-account-check.test.mjs containment case | real age two-account rehearsal passed in aggregate; real archive pending |

Historical A/B creation and baseline remain in the
[October 18 execution record](2026-10-18-friends-playtest.md). Their wallets,
sessions, quota, membership and temporary credential expiry have **not** been
rechecked this session. Do not recreate accounts or infer unchanged progression.

## Prepared stage packets

All packets target Worker `poker-game` at
`https://poker-game.nearyou1474.workers.dev`, Render `srv-db6dl0ss728c7384lhq0`
(Blueprint `exs-db6ddjnlot8c739prvmg`) and Atlas `poker_g / Cluster0 / poker_playtest`.
These are pinned identities, not freshly observed artifact/configuration values.
Before approving an executable window, record current Worker version, Render
deployment/configuration IDs, merged executable candidate/CI, rollback compatibility,
original flags/triggers, operator and start/end times. A missing field blocks entry.

| Packet | Actions and maximum effects | Entry still missing | Stop and restore |
| --- | --- | --- | --- |
| Account/mail | A/B normal reset, old HTTP/socket revocation, sign-out/switch; dedicated unverified C native verification. At most 12 sends: 3 planned + 1 justified retry each A/B/C. Human submits passwords/codes. | Current private sender/verified-sender comparison and quota; owned inboxes; C disposition; fresh A/B baseline and expiry inspection; approval naming revised send distribution/window. | Stop on target, delivery, quota or progression mismatch. Preserve old sessions until revocation checked; no account reset/re-provisioning. |
| Gameplay/economy | Two humans play consecutive fold/showdown hands; qualify through normal actions to cap boundary; separate timeout/practice zero checks. Human earned single pulls for A/B, one observed response loss, equip/return. Minimum planned pulls 2, one per alias, exactly 5 tickets each; no rerolls to manufacture rarity. | A1, current allowance/source audit/no unrelated participants; exact economy-enabled deployment and restored controls; approved human-run headed runner. | Stop on privacy/chip/reward/debit mismatch or uncertain receipt. End/drain; restore/read back exact prior startup flags and deploy triggers; smoke/economy audit. |
| Restart/fault | Natural unprobed idle/wake, transient network, separate unfinished-hand and post-settlement restarts. | Named operator/window and current flags/triggers; no unrelated players; exact restart deployment. Controlled overlap/lost-ack and process-scoped DB fault methods remain unsupported. | Abort uncertain writes; drain and restore original controls. Ordinary restart cannot pass runtime DB-failure/controlled-overlap gates. |
| Backup/restore | Stop every source writer and automatic wake/deploy source; audit, encrypted post-purchase dump and manifest; network-none authenticated restore with A/B copied login and receipt replay. No source restore. | Passed purchased-content baseline; exact writer-stop/reopen approval; image candidate/CI/manual merge, key/storage references, archive checksum, private encrypted full manifest and actual backed-up passwords/receipts. | Preserve previous good archive on any failure; no certification or reopen until containment, manifests, auth/progression and economy pass. Restore/read back prior source controls only through approved reopening. |
| Friends/exit | Six distinct humans, all seats, two hands, phone/desktop, reconnect and group earned pull/equip/return; drain, controls, smoke/audit and certified backup. | All P1–R4 passed; participants' consent/devices; named new operator/window and bounded pull count; operator free-tier acceptance. | Stop on blocking defect; retain unresolved issue; do not reopen questionable writes. No agent sends invitations to friends. |

## Gate status

P1 is incomplete: candidate CI is known, but provider/account/mail inventories and
live packets lack current evidence and approval. A1, G1, G2, G3, R1, R2, R3, R4,
F1 and X1 are **not run this session**. R2 controlled overlap/lost-ack and R3
runtime DB failure remain **blocked on a safe process-specific method**; the Free
service has no assumed shell/network control. Local tests do not waive these gates.
M5 is not complete and friends readiness is not granted.

Independent local tooling proceeds while these live prerequisites remain open.
One task PR owns this implementation; user merges manually. A real-archive run,
provider deployment or gameplay is not authorized by that PR's creation or merge.

## Local implementation verification

- Frozen install passed with Node 22.16.0 and pnpm 10.33.0.
- `pnpm check` passed on `9f224b6e`: 544 tests, all typechecks and configured
  contracts/engine/Nest/Next production builds. Includes operator 5/5 and restore
  4/4. No lint script exists.
- `pnpm test:backup` passed 1/1 using generated encrypted data and disposable
  authenticated MongoDB. PowerShell 7 parser and JavaScript syntax checks passed.
- Shared real collection Chromium rehearsal passed before the aggregate run;
  final full Chromium suite passed 35/35 in 4.2 minutes. The strengthened wrong-identity
  guard was separately rerun with the operator tests: 5/5 passed.
- [Executable-candidate CI 39259100767](https://github.com/24-HUB/poker-game/actions/runs/39259100767)
  completed/success, including aggregate checks, backup, Linux Worker bundle
  and the full Chromium suite. Later test/evidence heads are not covered by that
  run and need their own result.
- The real age pipeline uses generated account data, identity material and an
  encrypted archive/manifest. It passes normal auth/receipt replay/economy and
  rejects absent purchase content, checksum mismatch, ciphertext corruption,
  invalid dump, pre-app manifest mismatch and actual unsafe Docker configuration.
  Windows used the existing operator-managed age 1.3.2 executable on a task-local
  PATH; CI installs age for disposable rehearsals. No operator archive was read.
- A network-none namespace makes Chromium infer offline despite working loopback.
  The restore-only context supplies an online UI hint; actual Docker settings,
  routes and failed external TCP access are verified before and after execution.
  This is local R4 method evidence, not hosted network-recovery acceptance.

Independent read-only review found two Important issues, both addressed:
the rehearsal now calls the production age streaming/checksum/namespace pipeline,
and unresolved terminal-loss cleanup retains the original browser in memory.
The unconditional-close regression was observed red, then green; it reloads the
same receipt with one debit until human closure. A separate regression caught
and fixed removal of a still-executing route, which could forward twice.
Real-browser guards and the full Mongo-backed collection flow cover that fix.
Image provenance uses a clean allowlisted Git archive and matching candidate
label; local Docker/operator trust is required, not a cryptographic attestation.

Automatic approval review **rejected** opening the signed-in Render service
dashboard: private provider/account metadata inspection was considered outside
this implementation approval. No alternate provider-access channel was attempted.
Read-only P1 access to the named Render/Blueprint, Cloudflare Worker, Atlas
project/cluster and Brevo sender/quota must be explicitly approved before that
inspection resumes. Available browser inventory had no retained A/B/provider tabs;
session/account freshness and actual temporary-access expiry remain unverified.

Known provisioning-test path-with-spaces portability minor remains owned by a
future Codex defect task: reproduce in a disposable spaced checkout, then fix
only that regression through its own PR. It does not block use of the currently
verified space-free checkout. No hosted product defect was reproduced here.

Final origin fetch confirms dev remains `4f1e0e9b`, contained by this task branch
(0 behind). Complete task diff and whitespace reviewed; 21 local links and the
checkpoint mirror pass. Generated Next dev declarations were restored to the
previously tested production references. User merges manually; PR remains draft
for the later evidence/test head CI result and the explicitly open M5 work.

## PR #36 comment follow-up

Comment 6268654341 is addressed in `89976560`: Playwright automatic signal
closure is disabled for SIGINT/SIGTERM/SIGHUP, and restore success now requires
verified absence of both task containers. Removal attempts continue after an
individual failure; incomplete or unverifiable teardown produces sanitized
`CLEANUP_INCOMPLETE` recovery instructions through the CLI and PowerShell wrapper.
Both reported failures were reproduced before fixing them. Real browser signal
regressions pass 7/7; real age restore plus cleanup regressions pass 9/9,
including a successful account check whose deliberately failed teardown rejects.
The retained generated-data workloads were removed by the recovery helper.

At this executable commit, frozen install and `pnpm check` pass 551 tests,
all typechecks and configured production builds. Backup rehearsal passes 1/1.
Affected collection Chromium passed 1/1 (52.8 seconds). Review-fix CI
[39263455539](https://github.com/24-HUB/poker-game/actions/runs/39263455539)
is running; prior b7249420 CI completed successfully. The user has marked PR36
ready for review; the earlier draft description above is historical. Hosted M5
acceptance remains open. User merges manually.

## PR consolidation — 2026-10-21

At the user's request, PR #35 now owns both the original plan and implementation,
including both review fixes from PR #36. Continue on `codex/remaining-m5-plan`;
PR #36 is superseded and its branch/review history is retained. Neither PR was
merged. Dated PR #36 references above describe the earlier work.

Final implementation CI [39264756336](https://github.com/24-HUB/poker-game/actions/runs/39264756336)
and review-fix CI [39263455539](https://github.com/24-HUB/poker-game/actions/runs/39263455539)
were rechecked completed/success. Executable files are unchanged by this branch
consolidation; only documentation conflicts and current handoff pointers changed.
New-head CI remains pending. All hosted acceptance gates retain their prior state.
