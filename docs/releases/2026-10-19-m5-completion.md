# Remaining M5 execution — 2026-10-19

Implementation requested for [PR #35](https://github.com/24-HUB/poker-game/pull/35).
The [specification](../superpowers/specs/2026-10-19-m5-completion-design.md) and
[plan](../superpowers/plans/2026-10-19-m5-completion.md) govern execution.
This approves preparation/local implementation; live packets below still need
their named approval, current inventory and human inputs. No live operation ran.

Branch: `codex/m5-operator-tools`, based on freshly fetched `origin/dev` `4f1e0e9b`.
PR #35 remains open/unmerged. Its two approved reference documents are included
on this branch so the implementation is reviewable directly against dev.
Merged-base [CI 39135639483](https://github.com/24-HUB/poker-game/actions/runs/39135639483)
rechecked completed/success on October 19. This does not certify new executable code.

## Evidence register

| id | gate | candidate | environment | Bangkok timestamp | alias/operator | precondition | action | expected/observed invariant | result | evidence reference | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PRE-01 | P1 | 4f1e0e9b | GitHub | 2026-10-19 19:57 | agent | current fetch | inspect merged CI | completed/success | pass | linked CI above | verify tool candidate separately |
| TOOL-01 | G3 method | working branch | disposable local | 2026-10-19 19:51 | synthetic accounts | local replica set | collection Chromium rehearsal | one committed pull, same receipt, single debit, equip/next hand/re-login | pass | existing collection.spec.ts using shared protocol | rerun final code and full checks |
| TOOL-02 | R4 method | working branch | Docker network none | 2026-10-19 19:53 | synthetic fixture | no source material | inspect namespace/mounts/routes/TCP | egress denied, unsafe configuration rejected | pass | restore-account-check.test.mjs containment case | run full encrypted two-account rehearsal |

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
