# Friends Playtest Readiness Specification

Date: 2026-10-18 (Asia/Bangkok)
Status: written specification approved by the user's 2026-10-18 request to
implement PR #34; [implementation plan](../plans/2026-10-18-friends-playtest-readiness.md)
prepared for review. Draft PR #34 targets `dev`; named live actions remain unapproved.
Branch: `codex/friends-playtest-spec`; baseline: fetched `origin/dev` `fe654481`.

## Purpose and completion boundary

Make the existing hosted game ready for a private friends playtest, with observed
evidence that accounts, multiplayer, persistent progression and interruption
recovery work through the public Worker. Finish with a real six-person session
using phones and desktop browsers. Production cutover and launch are excluded.

This is an acceptance-and-fix project, not a replacement implementation of poker,
authentication, tickets, collection or bots. Correct defects that block the agreed
flows; preserve the current architecture and approved economy rules.

## Confirmed decisions

1. Preserve every existing hosted account, ticket, receipt and cosmetic. Use the
   existing environment; do not delete, reseed or reset progression.
2. Use two dedicated test accounts with inboxes controlled by the operator.
   Earn tickets through real human play; all test progression remains saved.
3. Require both two-account hosted checks and an operator-coordinated real
   six-person friends session, including phone and desktop use.
4. Plan deliberate interruptions only in an agreed maintenance window after
   confirming no unrelated players are active. Temporarily enable economy writes
   for authorized tests and restore the previously observed controls afterward.
5. Block readiness on privacy, authorization, balance/progression integrity,
   broken sign-in/recovery or inability to complete the core session loop.
   Minor visual issues may remain with a recorded owner and next action.

The user coordinates invitations, attendance and feedback. No messages to friends
or email test sends are authorized by this specification alone.

This revision makes existing acceptance requirements measurable; it does not
approve new live actions or promote proposed poker defaults to confirmed rules.
Work remains sequential and inline. The immediate deliverable is the reviewed
specification; application fixes and hosted execution follow a separate plan.

## Existing evidence and authority

The [2026-10-17 release record](../../releases/2026-10-17-private-release.md)
records successful encrypted hosted backup/isolated restore, schema 001–007,
paired proxy-secret rotation, unchanged progression and public shell/readiness
smoke. Last recorded controls: admission enabled, economy writes disabled;
backend online. These are historical observations, not fresh live assertions.

The source baseline includes practice bots, hand presentation/history and bounded
server recovery. CI evidence and local six-player tests exist, but neither proves
the full hosted flow. Recheck the exact candidate and provider state at execution.
Do not repeat migrations, rotate credentials or create another backup merely to
reproduce completed milestones. Evaluate freshness and compatibility first.

This scope narrows the earlier M5–M7 roadmap and the separate hosted-private-release
plan to friends acceptance. It does not authorize that plan's production tasks.
Historical checkpoint/checklist items may be stale; reconcile them using Git and
timestamped evidence, preserving the historical record.

### Implemented control boundaries

The current source defines these controls; execution must recheck them against
the actual deployed candidate:

| Control or invariant | Actual boundary and consequence |
| --- | --- |
| `ALLOW_NEW_SESSIONS=false` | Rejects new poker-session starts. Existing hands, room membership and authentication can still write. |
| `ECONOMY_WRITES_ENABLED=false` | Rejects new pulls and equipment changes. Standard human-only hands still settle and award qualifying tickets. Committed pull retries remain readable. |
| Startup configuration | Both flags are read once per process. Applying changed values requires a deployment with the saved environment; a restart alone retains the running configuration on the recorded Render setup. Such deployment interrupts live sessions. |
| Practice mode | A session containing bots is practice for every participant; no participant earns tickets. Use a separate human-only session for rewards. |
| Authority restart | Live sessions are aborted, not resumed at their previous hand/stack. Committed progression survives; room recovery must explain the interruption and require an explicit fresh session. |

Source references: [release flags](../../../apps/server/src/config/release-controls.ts),
[session admission/mode](../../../apps/server/src/modules/rooms/session.repository.ts),
[reward calculation](../../../apps/server/src/modules/tickets/rewardPolicy.ts),
[reward persistence](../../../apps/server/src/modules/tickets/tickets.repository.ts),
[pull replay/gate](../../../apps/server/src/modules/gacha/gacha.repository.ts),
[equipment gate](../../../apps/server/src/modules/collection/collection.repository.ts).
Neither flag is a database freeze or an account allowlist. An economy-enabled
window affects every authenticated account; absence of unrelated players is an
observed precondition, not enforced dedicated-account isolation.

## Approach and alternatives

Use five sequential stages on the current resources. This preserves previous
maintenance evidence and makes blockers visible before inviting friends.
A separate hosted environment provides stronger isolation but adds unapproved
resources and capacity work; it was not selected. Combining this work with private
production cutover broadens the approval and data boundary; it was not selected.

### Stage 1 — Preparation and exact execution package

Identify merged candidate SHA, successful required CI, Worker/backend artifact IDs,
public origin, database/schema/catalogue versions, compatible rollback artifacts,
maintenance controls, automatic-update settings and current active membership.
Reconcile code/configuration drift before testing. Record environment references
without credentials or account identifiers in Git.

Distinguish the planning PR head from the executable candidate: documentation
commits need not trigger a new application deployment. Reuse exact-candidate CI
only when application/configuration inputs are unchanged and compatibility is
recorded. Record backend SHA and Worker binary/configuration version separately;
do not infer equality from the current `dev` label. Pause approved automatic
updates for controlled drills; any artifact/configuration drift stops the drill
until the candidate and affected evidence have been reconciled.

Confirm the two inboxes privately, verified Brevo sender and quota headroom before
mail is sent. Identify the operator and maintenance window. Check relevant provider
documentation at execution rather than relying on historical free-tier limits.
Retain the existing encrypted recovery point and key-access procedure; assess its
age against current progression and the existing recovery targets.

Prepare a private baseline for accounts A/B: starting balances, daily earnings
and UTC date, owned items, equipment and existing receipts. Keep stable aliases
in Git and the mapping outside Git. Reuse a dedicated account if already present;
do not reset it or register another to evade earning or mail limits. Distinguish
test-owned active memberships from unrelated ones before every deployment.

Prepare a concrete package naming each proposed live action, target, expected
effect, stop condition and restoration step. Obtain explicit execution approval
before email sends, configuration changes, deployment or disruption. This document
and its later implementation plan authorize preparation only.

The package must specify account aliases, allowed email purposes/send budget,
candidate/resource IDs, read-only database scope, each deployment/drill, observed
and temporary flags, automatic-update settings, backup/restore targets and exit
checks. Confirm no unrelated players, then drain test play before configuration
changes; only the explicitly named mid-hand restart deliberately interrupts play.
Because there is no account allowlist, halt new test actions if unrelated players
appear and coordinate a safe drain rather than interrupting them. Record consent
and expected progression changes for all participants in the friends window.

**Exit:** the package is complete and approved for its named actions, exact
candidate CI and compatibility are recorded, and remaining stage prerequisites
have an owner. Missing quota, access, inboxes or a safe interruption method leaves
the affected gate blocked; it is not an instruction to provision replacements.

### Stage 2 — Hosted account acceptance

Through the public origin, register/verify the dedicated accounts, sign in/out,
reload and complete password recovery. Check wrong/expired/reused codes and bounded
resend behavior without consuming unnecessary mail or exposing valid codes.
Verify cookie/session isolation and that revoked credentials cannot continue
protected HTTP or Socket.IO actions. Keep passwords, email addresses, codes,
sessions and raw authentication output out of committed evidence.

For each dedicated account, verification must precede password sign-in and
must not itself create a session. Password reset preserves the same account and
progression, rejects the old password, revokes old HTTP/socket access and requires
new password login. Sign out in one account's browser and switch A/B in one browser
to check that cached wallet, collection and private room data do not cross accounts.
Use a separate browser context to check old-session revocation after reset.
For an already verified dedicated account, retain candidate-matching verification
evidence or record that prerequisite as pending; never unverify or delete it just
to repeat signup. Account recovery is still exercised on both accounts.

Wait for real expiry when testing expired codes; do not change hosted clocks,
challenge documents or rate counters. Use a bounded resend to show the prior code
fails and the latest works. Aggressive attempt/rate-limit races stay in isolated
regressions. Stop on delivery/quota failures and record them without repeated sends.

**Exit:** A and B each pass verification, login/logout/reload and reset/revocation
through the public origin, with unchanged pre-existing progression and no cache
or session crossover. Sender configuration alone does not pass delivery.

### Stage 3 — Hosted gameplay and progression acceptance

Create a private room, join by code, check seats/host/controller permissions,
start human-only poker and finish consecutive hands. Verify legal actions,
showdown/fold results, history, chip conservation and per-recipient card privacy.
Exercise refresh, reconnect and explicit tab takeover. Check proxy trust and real
Socket.IO polling-to-WebSocket behavior with designated accounts.

In the approved window, enable economy writes using the supported provider
configuration/deployment procedure. Observe legitimate qualifying manual actions
and committed receipts, including participation and positive-net rewards and the
20-ticket UTC cap. Before starting reward play, record each account's allowance;
use the hand's recorded UTC completion date, not the browser timezone. A qualifying
player was dealt in and made at least one valid manual action (a manual fold
counts); positive net means payouts minus all contributions including blinds.
At one remaining ticket, participation consumes it before the bonus. A payout
alone does not establish a bonus, and timeout-only play earns nothing.
Earn at least five tickets normally for a single pull; verify
the debit, receipt, ownership, equipment at the next hand and persistence after
sign-out/sign-in. Use mixed bots only for a separate practice check: practice must
not award tickets. Never seed balances to speed hosted acceptance.

Enable pulls/equipment before the session used to test them, after draining play
and applying the approved configuration deployment. Record the new artifact and
rerun smoke/account checks; do not toggle a flag between hands and assume the
live session survived. If a pull yields a duplicate on a reused account, preserve
the receipt and existing ownership; use an owned item for the equip check.
Respect the active-room navigation lock: complete/end the session and use the
existing deliberate-leave flow to visit collection, then explicitly start another
session to observe equipped cosmetics at its next deal. Do not bypass the lock
or require collection navigation during an active hand.

Verify uncertain-result recovery without creating a second charge/reward. If the
daily cap blocks a required scenario, record it and schedule another UTC day;
never bypass the cap. Ten-pull/pity exhaustive cases remain isolated regression
coverage unless legitimately earned hosted balances make them feasible.

For an uncertain single pull, drop only the designated browser's response after
submission using the reviewed method; recover the original request/receipt rather
than issuing a new request ID. Corroborate exactly one 5-ticket debit and one
receipt, unchanged result/pity on replay and the correct ownership delta. Rejoin
and history refresh must not duplicate a hand reward. A blocked/insufficient pull
must leave balance, pity and ownership unchanged. If no safe method can establish
an uncertain result, keep that check blocked rather than inventing an outcome.

Use separately authorized database-scoped read-only checks to corroborate receipts
and economy consistency. Do not point the existing fixture-based Playwright,
aggregate, migration or backup test suites at hosted resources. Hosted observations
use a separate operator checklist and ordinary designated-account actions.

**Exit:** at least two consecutive completed human-only hands, fold and showdown
results, refresh/reconnect/takeover and private-card isolation are observed. Sum
stacks plus committed chips/pots within a hand against the session's initial
total (2,000 for two humans); account for returned uncalled bets. Record expected
versus actual rewards per account/hand and reach the daily-cap boundary through
legitimate play on at least one account, showing no increase after exhaustion.
Complete one single-pull/equip/persistence loop on each dedicated account and
the separate no-reward practice check. No random draw rarity or all-in/side-pot
outcome is forced on hosted data; rare/exhaustive cases retain isolated coverage.

### Stage 4 — Interruptions and restored-account acceptance

Confirm no unrelated active players before each disruptive drill. Observe natural
sleep/wake without keepalive traffic, transient connection loss and authenticated
rejoin. In the approved window, restart during an unfinished test hand and after
a confirmed settlement. Interrupted hands must not award tickets; committed
balances, pull receipts and equipment must survive. Recovery must show honest
bounded states without automatic replay of game/economy mutations.

Distinguish a genuinely uncommitted unfinished hand from a committed settlement
whose browser acknowledgement was lost: the former is aborted with no reward;
the latter retains exactly one result and reward. After restart, old hand/session
commands cannot resurrect play. Verify fresh authenticated sync and explicit new
session start. For natural sleep, close sockets/tabs and stop all probes for the
provider's documented idle period; record provider state and first-visit timing.
A timeout alone does not prove sleep. Recheck the implemented 90-second session
recovery bound, terminal Retry and authoritative 401 behavior; an outage must
not be reported as logout. Record a bound exceeded as a failure, not an extended
automatic retry window.

Test database-unavailable and overlapping-deployment/authority fencing scenarios
only using a reviewed non-destructive method with explicit targets and restoration.
Never broaden an Atlas outage or revoke shared access speculatively. If a safe
hosted method cannot be approved, record the blocker; isolated coverage alone
cannot silently satisfy the hosted gate.

Use the retained encrypted backup for an approved isolated restored-account check:
metadata, sign-in/session behavior, receipts, ownership, equipment and economy.
Disable outbound mail and hosted connections in the restore environment. Never
restore onto the source database. Use the documented recovery targets: loss no
greater than progress since the last successful backup; safe reopening within one
operator-attended day. Record measured scope/time and backup-age limitations.

Check archive contents before claiming restored-account acceptance. The retained
2026-10-17 archive was captured before migrations 006–007 and this acceptance run;
its recorded audit had zero pull/owned/equipment rows. It cannot prove restoration
of later accounts, purchases or equipment. Confirm whether A/B exist in it. If
it lacks the required records, prepare a separately approved consistent backup
after Stage 3 using [operations.md](../../operations.md), including full writer
shutdown; neither flag alone is enough. This is the required post-session recovery
point, not permission to repeat source migrations or reset progression.

Compare restored metadata/data against that archive's manifest before starting
an application or applying any required restore-target-only migrations. Record
those transformations separately. Use a private, isolated loopback app/browser
with fresh local secrets, no provider/source-database credentials or reused hosted
session cookies, and blocked provider/mail egress; disable automatic jobs and deny
access to the source database. The private
package must identify how A/B can sign in without live email or synthetic changes
to copied progression. Verify their backed-up balances, receipt replay, ownership
and equipment against that recovery point, not against newer source records.
Report missing post-backup progress as the measured loss window. A drill measures
time to a locally verified safe-reopen decision; do not claim actual source
restoration or proven incident recovery time when no source restore occurred.

Restore the pre-window controls and automatic-update settings after authorized
checks when safe. If integrity is uncertain, keep affected writes closed and
report the exact recovery action instead of reopening automatically.

**Exit:** each named interruption and isolated restored-account check passes,
no lost/duplicated committed progression is found, and flags/artifacts/automatic
updates are read back after restoration with public smoke and an economy audit.
Any discrepancy stops progression testing. Preserve evidence and the last verified
backup; never repair balances or overwrite the source as part of diagnosis.

### Stage 5 — Friends session and readiness decision

Provide a short operator checklist covering join, playable phone/desktop controls,
six human seats, consecutive completed hands, reconnect, rewards, collection and
return/sign-in. The user recruits/coaches friends and records observations.
Two dedicated accounts do not substitute for six real participants at this gate.
Any wider economy-enabled friends window needs its own stated controls and approval.

**Entry:** Stages 1–4 pass and all blockers are resolved before invitations to the
acceptance session. This is permission to propose the six-person window, not a
claim that the friends gate already passed. The user coordinates communications.
Plan the separate window's economy deployment before friends start, because it
interrupts play; restore controls only after everyone has ended/drained play.

Record actual participant count, browser/device classes, date, candidate and
per-check outcome. Collect economy pacing, forced-blind qualification and duplicate
policy feedback separately from defects. Missing attendees/devices leave the gate
pending. No deadline or participant availability has been promised.

**Exit:** six distinct humans occupy all six seats in one standard session and
complete at least two consecutive hands through the public Worker, with at least
one phone and one desktop browser represented. Each can see their own cards,
turn/timer and usable legal controls; no core control is obscured by the mobile
keyboard or safe area. Observe a designated participant reconnect without leaking
cards or duplicating actions. Corroborate qualifying rewards, one earned
pull/equip/return flow within the group, and the saved account/progression after
sign-in again. Check core touch/keyboard/focus and reduced-motion behavior; do
not require friends to reproduce destructive or authorization-negative drills.

## Evidence, defects and readiness rules

Each check records candidate/environment, Bangkok timestamp, expected/observed
behavior and pass/fail/blocked/not-run status, plus a sanitized evidence reference.
Keep private logs, account mappings and receipts outside Git with restricted access.
Public hand data may be referenced only after privacy review; never commit private
cards, invite codes, sessions or provider secrets.

The implementation plan must map these gates to exact candidate regression
tests and a separate hosted operator procedure. Initial status for every new
acceptance gate is **not run**; this review supplies no hosted pass evidence.

| Gate | Required evidence |
| --- | --- |
| P1: candidate/window | Exact CI/artifact/configuration inventory, approved package and fresh pre-window active-membership check. |
| A1: account lifecycle | A/B delivery, verification, login/reset/revocation and cache isolation; unchanged prior progression. |
| G1: multiplayer/privacy | Two-human hands and chip totals; authorized versus observer/outsider projections and actions; real polling-to-WebSocket upgrade. |
| G2: tickets/practice | Hand/UTC-day reward deltas, participation-first cap boundary and exhaustion; no practice rewards. |
| G3: collection/replay | A/B 5-ticket pulls, one debit/receipt per request including uncertain recovery; ownership/equip/next-hand/persistence. |
| R1: sleep/reconnect | Confirmed natural idle/wake, elapsed recovery bounds and authenticated reconnect without mutation replay. |
| R2: restart/fencing | Unfinished versus committed-hand interruption, stale authority/session rejection, explicit new session and durable progression. |
| R3: database outage | Approved scoped fault, honest unavailable state, no false logout or partial/duplicate commit, safe restoration/audit. |
| R4: restored accounts | Content-sufficient encrypted recovery point, isolated A/B auth/progression/receipt checks, manifest comparison and measured loss/time limits. |
| F1: six friends | Six humans, phone/desktop usability, consecutive hands, reconnect and group progression loop; operator acceptance. |
| X1: safe exit | Original controls and automatic updates restored/read back, smoke/audit, post-session backup per retention policy or a recorded blocker. |

Use stable evidence IDs and include preconditions, action, expected invariant,
actual observation, candidate, timestamp, result, private evidence reference,
operator and next action. `blocked` means a prerequisite/method is unavailable;
`fail` means observed behavior violated acceptance. Neither counts as pass.
Evidence can be reused only with its original scope and unchanged relevant
inputs; after a fix/configuration change, rerun affected gates and final smoke.

Any privacy/authorization breach, incorrect debit/reward, lost committed progress,
broken account recovery or inability to complete a session is a blocker. Reproduce
defects in isolation, fix on a task branch through a PR to `dev`, add meaningful
regressions and verify before an authorized redeploy. The user merges manually.
Record minor visual defects with impact, owner and next action; do not use this
exception for unreadable/obstructed mobile gameplay or inaccessible core actions.

For executable fixes, use pinned pnpm 10.33.0 with frozen lockfile, relevant tests,
`pnpm check`, affected real Socket.IO/browser flows and Linux Worker CI as applicable.
For documentation-only changes, review accuracy/links/diff and `git diff --check`.
Do not imply old CI passed a newer fix or that local results prove hosted behavior.

The repository currently has no lint script; do not claim a lint pass. Refer to
[package.json](../../../package.json) and the candidate CI for actual commands.
For a blocker, record severity, reproduction, impact, owner, fixing PR/commit,
regression result and hosted retest. A fix is not closed by a merge alone.

Readiness requires all five stages to pass, no unresolved blocking defects, recorded
nonblocking issues, safe final controls, current candidate identity and explicit
operator acceptance of observed free-tier limitations. Mark this as friends
playtest readiness only. Production cutover/launch, paid upgrades, real-money
purchases, new game
features, balance-policy changes and automatic monitoring are outside scope.

## Handoff and next artifact

Update the existing release checklist, release evidence, `CHECKPOINT.md` and
`plan.md` checkpoint with actual results; do not create another checkpoint file.
Keep the current spec PR draft until the implementation plan has been reviewed.
No provider actions or application implementation occurred while writing this
specification or plan. The linked plan supplies task-by-task files/commands,
prerequisites, execution approvals and stop conditions; review it before execution.

The existing release record's latest maintenance exit takes precedence over its
historical unchecked items (for example pre-migration inventory). Reconcile those
items in the later execution plan/record; this spec review does not mark any
hosted checklist item complete. The readiness decision records candidate and
environment, all gate outcomes, remaining minor issues and operator acceptance.
If an attendee, safe fault method or recovery prerequisite is missing, hand off
the exact pending gate; do not relabel partial acceptance as ready.
