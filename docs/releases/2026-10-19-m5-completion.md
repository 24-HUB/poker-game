# Remaining M5 execution — 2026-10-19

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
