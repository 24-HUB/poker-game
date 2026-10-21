# Remaining M5 Completion Specification

Date: 2026-10-19 (Asia/Bangkok)
Status: **Implementation approved by the user on 2026-10-19 through PR #35.** The user requested this specification and its
[implementation plan](../plans/2026-10-19-m5-completion.md) together. Neither
document authorizes new live operations. Existing, unrevoked authorizations retain
their original scope; an expired maintenance window or credential is not renewed.

## 1. Outcome and scope

Finish the remaining friends-playtest milestone on the existing Next.js Worker,
NestJS/Socket.IO backend and MongoDB replica set. Preserve personal accounts and
every committed balance, receipt and cosmetic. Keep the $0 hosting target, manual
PR merges into `dev`, and sequential inline execution.

Most product functionality already exists. This work adds narrowly scoped
operator test tooling where the recorded execution method is missing, completes
hosted acceptance and fixes reproduced blockers. It does not replace the poker
engine, auth, rewards, gacha or collection, introduce a public test endpoint,
change economy tuning, buy services, or authorize production launch. M6/M7 remain
separate work under the [earlier roadmap](../plans/2026-09-30-m3-through-production.md).

This is the remaining-work specification after merged
[PR #34](https://github.com/24-HUB/poker-game/pull/34). It updates the forward
sequence in the [October 18 design](2026-10-18-friends-playtest-readiness-design.md)
without erasing that design or its [execution evidence](../../releases/2026-10-18-friends-playtest.md).

## 2. Completed baseline and freshness

Known target identity (recheck live artifacts/configuration; do not infer them
from a Git branch):

| Resource | Named target |
| --- | --- |
| Public Worker | `https://poker-game.nearyou1474.workers.dev`; existing Worker name `poker-game` |
| Render backend | `srv-db6dl0ss728c7384lhq0`; existing Blueprint `exs-db6ddjnlot8c739prvmg` |
| Atlas | `poker_g / Cluster0 / poker_playtest`, SRV host `cluster0.lxb4kqs.mongodb.net` |
| Encrypted backup location | Existing operator-controlled `D:\PokerBackups`; never a plaintext archive in the repository |

| Evidence | Reuse boundary |
| --- | --- |
| PR #34 merged as `4f1e0e9bb0d2645f07eacf0defd2aeb90bd7d42f`; [merged CI](https://github.com/24-HUB/poker-game/actions/runs/39135639483) succeeded | Rechecked during planning. New executable changes require their own checks and merged-candidate evidence. |
| October 18 A/B creation, separate-context sign-in and full reload | Keep these accounts; no repeat provisioning, un-verification, reset, seed or cap bypass. Recheck sessions before resumed use. |
| Both wallets 0/revision 0, earned 0 on UTC 2026-10-18; 20 daily allowance | Historical baseline only. Re-read today's allowance/date and any intervening progress. |
| Alice/Club default equipped; no nondefault ownership, equipment rows, pull/reward receipts, ledger or banner progress | Source/UI baseline was observed, not a permanent claim of emptiness. |
| Migrations 1–7, celestial-v1/hash, no active participants/memberships, one live authority/epoch 34 | Recheck before live changes. This was not a new validator/index or global economy certification. |
| Public shell 200/readiness ready; earlier encrypted backup/restore and local transaction/browser regressions | Keep their exact dates and scope. They do not prove natural wake, current restore content or six real humans. |

October 18 temporary provisioning access was time-limited to six hours. By this
planning date its scheduled lifetime has elapsed: inspect actual expiry/cleanup,
do not reuse or widen it, and leave the A/B game accounts intact. Existing Atlas
Data Explorer access already supported a projected baseline without another role.

The October 17 archive predates A/B and their future purchases. Preserve it as a
known recovery point; it cannot prove restoration of this later progression.

## 3. Invariants and fixed values

- Node **22.16.0**, pnpm **10.33.0**, committed lockfile; no unrelated upgrades.
- Poker remains server-authoritative with recipient-specific private cards.
  Human-only A/B sessions are separate from mixed-bot practice sessions.
- Reward policy v1: dealt in plus at least one valid manual action; participation
  **1**, positive-net bonus **1**, UTC daily cap **20**. Net includes blinds and
  all contributions. At one remaining ticket, participation is granted first.
  Timeout-only and every practice participant earn **0**.
- Single pull costs **5 tickets**. Earn through normal play; do not inject balances
  or demand a particular rarity. A legitimate duplicate is a valid recorded result.
- `ALLOW_NEW_SESSIONS=false` blocks starts, not authentication or all writes.
  `ECONOMY_WRITES_ENABLED=false` blocks new pulls/equipment, not qualifying hand
  settlement or committed receipt replay. Both are startup settings. Neither is
  an account allowlist or a database freeze.
- A configuration deployment must apply saved settings; a same-configuration
  restart is a different operation. Drain first except the specifically approved
  unfinished-hand drill. Restarted live poker sessions abort; committed progress
  survives and a fresh session must be explicitly started.
- No secrets, codes, emails, account IDs, invite tokens, private cards or raw
  sessions in Git or diagnostic output. Use stable aliases and fixed error labels.
- All real-money/provider billing actions remain outside this plan. The human
  performs hosted poker actions and cosmetic-pull clicks; tooling observes or
  interrupts the specifically approved response, never plays hands for them.

## 4. Changes proposed for review

These are planning proposals, not additional permissions inferred from Package A.

1. **Verification account C:** use one operator-owned dedicated unverified account
   for native signup verification. Reuse an inspected suitable unverified test
   account if available; otherwise prepare a new `Verification Probe C` with an
   owned inbox alias. Never unverify A/B or use a personal account. Creating C,
   its credential submission and its email sends need named approval/human input.
2. **Revised mail packet:** at most **12 sends total**, **4 each for A/B/C**.
   Nine planned sends: C verification 3, A recovery 3, B recovery 3. One extra send
   per account is reserved only for an explained delivery retry. This replaces
   the proposed distribution of the previous 12-send ceiling only after approval.
3. **Operator-owned response-loss runner:** prepare a separate, human-run browser
   tool, rehearse it locally, and explicitly approve its hosted run. It does not
   convert fixture suites into live tests or bypass the agent's browser policy.
4. **Stage-specific packets:** approve prerequisites and actions for each stage.
   An unresolved later drill remains blocked and prevents friends readiness, but
   does not require repeating completed account setup or forbid an independently
   authorized earlier stage. This clarifies the earlier global P1 sequencing.

## 5. Remaining acceptance contracts

| Gate | Required observable result | Entry and owner |
| --- | --- | --- |
| P1 | Current candidate CI, backend/Worker identities, compatible rollback, flags/triggers, quota/sender, fresh account/member baseline, named action/restoration packet | Agent prepares; operator approves its exact live scope/window. |
| A1 | C verifies normally without creating a session; A/B recover passwords; expiry/resend/reuse and old HTTP/socket revocation work; sign-out/re-login and same-browser A/B switching preserve isolation/progression | Approved mail packet, owned inboxes, current sender/quota, operator code/password entry. |
| G1 | A/B complete two consecutive human-only hands, including fold and showdown; chip conservation, seats/host/controller/takeover, observer/outsider privacy, real polling-to-WebSocket upgrade and reconnect | Two human participants and approved gameplay window. Preserve original two-human requirement. |
| G2 | Per-hand qualification/net/UTC receipts match policy, one-remaining-ticket boundary and exhaustion observed on at least one account, timeout-only zero, separate practice zero | Fresh allowance and authorized persistent test progression. |
| G3 | Each A/B completes earned single-pull/equip/return flow; one interrupted committed pull recovers original receipt/result/pity with one debit; rejected pulls change nothing | At least 5 legitimately earned tickets per required pull, approved economy configuration and response-loss runner. |
| R1 | Confirmed natural idle/wake and transient loss preserve honest unavailable state; authenticated recovery within existing **90 seconds**, no replay or false logout | No probes/tabs/sockets during idle; provider sleep observation. |
| R2 | Separate unfinished-hand and post-settlement restarts preserve their different invariants; controlled stale-authority and lost-ack variants have actual evidence | Named restart/overlap/ack methods, fresh no-unrelated-player check and restoration. |
| R3 | Scoped database unavailability cannot cause false logout, partial/duplicate commits or lost progression; restoration audited | Reviewed runtime-specific fault method. No shared Atlas pause, shared-credential revocation or broad network edit. |
| R4 | Content-sufficient encrypted recovery point restores A/B authentication, receipts/replay, ownership/equipment and economy in isolation; measured loss/time reported | Post-progression backup with every writer stopped, key access, validated isolated runner. |
| F1 | Six distinct humans occupy all seats and finish two consecutive hands; phone and desktop, reconnect, usable controls and group earned pull/equip/return observed | All prerequisite gates pass and operator arranges consent, attendance and separate window. |
| X1 | Safely drain, restore/read back prior controls/triggers, smoke/audit and certified post-session backup; exact unresolved issue retained if reopening is unsafe | Runs after each live window and at final exit; operator owns reopening. |

### A1 code and session sequence

For C verification and for each A/B reset: send code 1, wait beyond the real
**10-minute** TTL and reject it; send code 2, wait at least **60 seconds**, resend
code 3, reject superseded code 2 while code 3 is live, accept code 3 and reject
reuse. Use malformed/wrong inputs sparingly, at most two deliberate wrong live
attempts per challenge and below the implemented five-failure boundary. Never
alter clocks, challenges, rate counters or account verification state.
The normal registration-generated verification message is C's first send; do not
request an extra code just to begin the sequence. Count actual provider sends,
including any unexpected notification, and stop if the approved budget cannot fit.

Verify A/B unchanged account identity/progression, rejection of the old password,
revocation of an HTTP session and actual Socket.IO connection created before
reset, then login with the new password. Keep the old session context alive while
the operator resets through a separate context. If only two usable isolated
contexts exist, process accounts sequentially and re-establish the next baseline.
The operator enters/submits new passwords and codes privately. Do not sign out
the pre-reset session before checking revocation. C must still perform password
sign-in after verification; a verification success is not a session.

### Gameplay and progression sequence

Use normal invitations and human actions; do not force deck/randomness or private
cards. Measure stacks plus committed chips/pots against initial session total
(2,000 chips for two humans under current defaults), including returned uncalled
bets. Record hand completion UTC date and receipt deltas. A payout alone does not
prove positive net. Wait another UTC day if allowance prevents a required case.

Deploy economy-enabled configuration before the relevant session. End/leave via
normal flow before collection; equip an owned item and start a fresh session to
observe it at the next hand. Do not bypass the active-room navigation lock.
Run practice separately. Compare source receipts with the fresh baseline and run
the existing read-only `verifyEconomy(db)` snapshot verifier; an Atlas count query
alone is not the full economy audit.

## 6. Operator tooling contracts

### Committed pull response loss

Add a dedicated runner under `apps/web/scripts/operators/`, using the already
pinned Playwright dependency. It launches an ephemeral headed context with no
storage-state file, traces, video, failure snapshots, raw network logs or saved
credentials. The CLI pins the exact public Worker, rejects credential arguments,
requires a typed target/action confirmation, and verifies the expected display
name before arming. The operator signs in and clicks the one approved pull.
The exact arm phrase is `WITHHOLD ONE 5-TICKET PULL RESPONSE`. It is prompt input,
not a shell command. No route is armed before this confirmation.

Route only `POST /api/pulls`, once. Forward the original body/request ID once with
no redirects or transport retries. Require HTTP **201** and a valid
`pullReceiptSchema` matching that request. Hold the committed response, reload
the same page, release/dispose the old route, and observe recovery of the same
receipt through the normal UI/GET path. Compare the before/after balance and
receipt/result/pity in memory plus the approved source audit. Retain the original
pending identity on uncertainty; never automatically create a replacement request
or new context. Any unestablished commit stops as uncertain, not passed.

The existing [collection rehearsal](../../../apps/web/tests/e2e/collection.spec.ts)
already proves this protocol locally. [Playwright's route API](https://playwright.dev/docs/api/class-route#route-fetch)
supports fetching before delivery. That API is not exposed by the current agent
browser controls: the proposed hosted runner is operated by the human only after
its separate approval. Do not use an alternate browser-control channel implicitly.

### Isolated restored-account runner

Prepare the runner image/dependencies from an allowlisted clean candidate source
archive **before** mounting real backup material. Keep Node/pnpm pins, use the
existing server/web builds, and install matching Chromium during that build.

Run authenticated MongoDB with `--network none`, tmpfs database storage and no
published ports. The application/browser runner shares that container's network
namespace with `--network container:<isolated-mongo-id>`. MongoDB, NestJS, frontend,
local proxy and Chromium communicate only over that namespace's loopback. The
browser runs inside it; the failed earlier host-browser/internal-network approach
is not reused. No source/provider credential, Docker socket or host-network mount
belongs inside either container. An outer operator orchestrator may use Docker;
the isolated workload cannot control Docker.
CI/disposable restore tests generate their own data and encryption material;
they accept no environment override to a hosted URI or real operator archive.

Validate Docker network/mounts, no default route and failed external TCP access
before decrypting. Stream encrypted archive to restore, check every process exit,
map source namespaces to a unique `poker_test_restore_<uuid>` database, and compare
the archive manifest before starting apps or target-only migrations. Use fresh
local auth/proxy secrets, memory/disabled email and disabled automatic jobs.
Never invoke fixture account seeding or the existing fixture stack on copied data.

The human supplies A/B login aliases and backed-up passwords through private
stdin only; passwords are masked. The wrapper requires the exact phrase
`RESTORE ARCHIVE INTO ISOLATED LOCAL RUNNER` before reading real archive material.
Verify normal login, saved progress and original receipt replay without another charge.
Compare durable progression before/after. Record expected local session/lease
writes separately from the pre-application full-manifest comparison. No source
restore occurs. Report the backup loss window and elapsed time to a local safe
reopen decision; target at most one operator-attended day, not an invented RTO.

## 7. Provider and fault-method limits

Current primary references checked 2026-10-19:

- [Render Free](https://render.com/docs/free) documents 15-minute inbound-idle
  spin-down and excludes shell access and multi-instance scaling. This prevents
  assuming per-process network controls exist on this service.
- [Render deployment behavior](https://render.com/docs/deploys) distinguishes a
  same-configuration restart from applying edited environment settings. A rolling
  replacement may overlap instances; that alone does not prove a controlled
  stale-authority or lost-ack test.
- [Atlas Free backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/)
  now include an optional billed subscription. It is not selected under $0.
  Continue the approved manual encrypted quiescent-dump approach; never enable
  billing or a paid backup from this plan.

For R2 overlap/lost-ack and R3 runtime database failure, the executor must first
produce a method record naming the affected process/request, containment,
observable trigger, independent commit proof, restoration and abort conditions.
If the existing service cannot supply a safe method, mark that check **blocked**.
Local fault tests remain supporting evidence. Do not introduce a public fault
endpoint, disable TLS/auth, disrupt shared Atlas or call a restart a database
outage. No waiver, new hosted service or paid upgrade is implied; any scope change
returns to the operator for an explicit decision before F1.

## 8. Execution packets and completion

Each live packet contains candidate/Worker/backend IDs, operator/window,
participating aliases, baseline, exact actions, expected persistent effects,
maximum sends/pulls, stop conditions, restoration and approval evidence. Use one
packet each for account/mail, gameplay/economy, restart/fault, backup/restore and
friends/exit. Recheck no unrelated participants immediately before disruption.
An economy-enabled window is global, not isolated to A/B.

Evidence rows carry `id`, `gate`, `candidate`, `environment`, Bangkok timestamp,
alias/operator, precondition, action, expected/observed invariant, result
(`pass|fail|blocked|not run`), sanitized evidence reference and next action.
Keep mappings, private receipt IDs and encrypted manifests outside Git.

Any privacy/authorization breach, wrong debit/reward, lost committed progress,
broken recovery or inability to finish a session blocks readiness. Reproduce in
disposable isolation, fix narrowly through a PR, verify and obtain the affected
redeploy/retest approval. Minor visuals require an owner and next action; core
mobile readability or inaccessible controls are blockers.

M5 is complete only when all P1–X1 requirements pass, controls are safely restored,
backup evidence is current and the operator accepts recorded free-tier limits.
No pending/blocked check is silently downgraded. This planning task provides no
new hosted pass. The plan maps every gate and proposed tool to an owning task.
