# Friends Playtest Readiness Specification

Date: 2026-10-18 (Asia/Bangkok)
Status: conversational scope approved; written specification awaiting review.
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

Confirm the two inboxes privately, verified Brevo sender and quota headroom before
mail is sent. Identify the operator and maintenance window. Check relevant provider
documentation at execution rather than relying on historical free-tier limits.
Retain the existing encrypted recovery point and key-access procedure; assess its
age against current progression and the existing recovery targets.

Prepare a concrete package naming each proposed live action, target, expected
effect, stop condition and restoration step. Obtain explicit execution approval
before email sends, configuration changes, deployment or disruption. This document
and its later implementation plan authorize preparation only.

### Stage 2 — Hosted account acceptance

Through the public origin, register/verify the dedicated accounts, sign in/out,
reload and complete password recovery. Check wrong/expired/reused codes and bounded
resend behavior without consuming unnecessary mail or exposing valid codes.
Verify cookie/session isolation and that revoked credentials cannot continue
protected HTTP or Socket.IO actions. Keep passwords, email addresses, codes,
sessions and raw authentication output out of committed evidence.

### Stage 3 — Hosted gameplay and progression acceptance

Create a private room, join by code, check seats/host/controller permissions,
start human-only poker and finish consecutive hands. Verify legal actions,
showdown/fold results, history, chip conservation and per-recipient card privacy.
Exercise refresh, reconnect and explicit tab takeover. Check proxy trust and real
Socket.IO polling-to-WebSocket behavior with designated accounts.

In the approved window, enable economy writes using the supported provider
configuration/deployment procedure. Observe legitimate qualifying manual actions
and committed receipts, including participation and positive-net rewards and the
20-ticket UTC cap. Earn at least five tickets normally for a single pull; verify
the debit, receipt, ownership, equipment at the next hand and persistence after
sign-out/sign-in. Use mixed bots only for a separate practice check: practice must
not award tickets. Never seed balances to speed hosted acceptance.

Verify uncertain-result recovery without creating a second charge/reward. If the
daily cap blocks a required scenario, record it and schedule another UTC day;
never bypass the cap. Ten-pull/pity exhaustive cases remain isolated regression
coverage unless legitimately earned hosted balances make them feasible.

Use separately authorized database-scoped read-only checks to corroborate receipts
and economy consistency. Do not point the existing fixture-based Playwright,
aggregate, migration or backup test suites at hosted resources. Hosted observations
use a separate operator checklist and ordinary designated-account actions.

### Stage 4 — Interruptions and restored-account acceptance

Confirm no unrelated active players before each disruptive drill. Observe natural
sleep/wake without keepalive traffic, transient connection loss and authenticated
rejoin. In the approved window, restart during an unfinished test hand and after
a confirmed settlement. Interrupted hands must not award tickets; committed
balances, pull receipts and equipment must survive. Recovery must show honest
bounded states without automatic replay of game/economy mutations.

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

Restore the pre-window controls and automatic-update settings after authorized
checks when safe. If integrity is uncertain, keep affected writes closed and
report the exact recovery action instead of reopening automatically.

### Stage 5 — Friends session and readiness decision

Provide a short operator checklist covering join, playable phone/desktop controls,
six human seats, consecutive completed hands, reconnect, rewards, collection and
return/sign-in. The user recruits/coaches friends and records observations.
Two dedicated accounts do not substitute for six real participants at this gate.
Any wider economy-enabled friends window needs its own stated controls and approval.

Record actual participant count, browser/device classes, date, candidate and
per-check outcome. Collect economy pacing, forced-blind qualification and duplicate
policy feedback separately from defects. Missing attendees/devices leave the gate
pending. No deadline or participant availability has been promised.

## Evidence, defects and readiness rules

Each check records candidate/environment, Bangkok timestamp, expected/observed
behavior and pass/fail/blocked/not-run status, plus a sanitized evidence reference.
Keep private logs, account mappings and receipts outside Git with restricted access.
Public hand data may be referenced only after privacy review; never commit private
cards, invite codes, sessions or provider secrets.

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

Readiness requires all five stages to pass, no unresolved blocking defects, recorded
nonblocking issues, safe final controls, current candidate identity and explicit
operator acceptance of observed free-tier limitations. Mark this as friends
playtest readiness only. Production deployment, paid upgrades, purchases, new game
features, balance-policy changes and automatic monitoring are outside scope.

## Handoff and next artifact

Update the existing release checklist, release evidence, `CHECKPOINT.md` and
`plan.md` checkpoint with actual results; do not create another checkpoint file.
Keep the current spec PR draft until the written spec and implementation plan have
been reviewed. No provider actions or application implementation occurred while
writing this specification. After written-spec review, create a task-by-task plan
with exact files/commands, prerequisites, execution approvals and stop conditions.
