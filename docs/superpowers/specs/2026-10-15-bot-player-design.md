# Bot players for solo and friends play

Date: 2026-10-15 (Asia/Bangkok)
Status: Written specification approved by the user's 2026-10-15 request to implement
PR #31. Implementation plan prepared; awaiting plan review before application changes.
Baseline: freshly fetched `origin/dev` `17a43ba5`.
Task branch: `codex/bot-player-plan`; specification/plan documentation, targeting `dev`.

## 1. Outcome and approved decisions

A host can fill empty seats with casual computer opponents and play alone or
with friends using the existing poker table. A bot session is explicitly practice:
it never earns persistent tickets. Success means one human can finish a real,
authoritative session against bots, see correct results, and reconnect safely.

The user approved these choices through a one-question-at-a-time interview and
approved the combined design in chat:

| Decision | Approved behavior |
|---|---|
| Availability | Host adds bots to empty seats for solo or mixed human/bot play. |
| Rewards | Every session starting with a bot awards no tickets throughout. |
| Roster | Add/remove bots only while the room is waiting, before a session. |
| Strength | One casual difficulty, with poker-aware choices and variation. |
| Session end | End when every human is out of chips; show final standings. |
| Pace | Random 1–3 second thinking delay per bot turn. |
| Disconnect | Pause when all humans disconnect; allow two minutes to reconnect, then close the room and abort the unfinished session. |

Approved combined-design defaults: six seats total, obvious Bot labels, equal
starting stacks, normal poker rules, only a bot's own cards and public information
available to its strategy, bots retained in the lobby after a normal session end,
and bots never becoming host. A later humans-only session earns tickets normally.

The technical decisions below make those behaviors implementable. They are
proposed engineering defaults for review, not claims of existing functionality.
No feature code, migration execution, deployment or provider change is authorized
by this documentation task.

## 2. Existing code and integration boundaries

The current application has working rooms, poker, settlement, tickets and table
UI. Relevant boundaries inspected on the baseline:

- `packages/contracts/src/{rooms,poker}.ts` defines validated socket commands,
  recipient-specific views and persisted/public result shapes.
- `apps/server/src/modules/rooms/{room.service,room.repository,session.service,
  session.repository,game.service}.ts` owns serialized room commands, human
  membership, durable session starts and clock-driven poker transitions.
- `apps/server/src/modules/settlement/settlement.repository.ts` currently ensures
  participant wallets before settlement; `tickets.repository.ts` then awards
  rewards. Both boundaries need explicit practice-session protection.
- `apps/server/src/projections/{roomProjection,gameProjection}.ts` and
  `apps/web/src/features/rooms/{RoomLobby,PokerTable,HandResultPanel,
  HandCompletionBar,HandHistory}.tsx` deliver and display authoritative state.
- Migrations `001`–`006` exist. Human membership has a unique occupied-seat
  index, but that index alone cannot reserve a separate bot seat. Current poker
  participants and engine actor keys are named `accountId`.

Current starts use 1,000 chips and 10/20 blinds. Human turns have a 30-second
deadline; committed hand results remain visible for five seconds. Retain these
values and the current global active-session admission limit. The feature does
not introduce separate practice matchmaking or bypass maintenance controls.

## 3. Approach and ownership

Use a small server-side rules strategy, a restricted observation builder and a
clock-driven bot turn path in the existing room authority. No bot sockets,
authentication sessions, fake human accounts, external AI service or new runtime
dependency are required.

Alternatives considered: random legal actions are cheaper but poor casual poker;
simulation-driven decisions add computation and tuning beyond the first casual
difficulty. Neither is needed for this release.

Keep units focused:

| Unit | Responsibility and dependencies |
|---|---|
| Room bot roster | Persist seat reservations and validate host commands through existing queues, transactions and command receipts. |
| Bot observation | Copy only permitted information from the active hand; never pass the complete engine state to strategy. |
| Bot strategy | Pure observation + injected random input -> one legal poker action. |
| Game authority | Schedule, fence, validate and apply bot actions through the same engine/accept/settlement path as human play. |
| Human-presence lifecycle | Freeze/resume practice play and preserve existing empty-room cleanup and restart behavior. |

The poker engine remains pure. Extend its action-source union to
`'manual' | 'timeout' | 'bot'`; only `manual` marks human reward qualification.
Bot timers submit an internal authorized intent, never an impersonated human
`game:action` with invented cookies or controller credentials.

## 4. Bot roster, identity and commands

Store a bounded optional `bots` array on the room document. Each entry is
`{ botId, displayName, seat }`; missing arrays mean empty for legacy rooms.
`botId` is server-generated `bot:<UUID>` and remains stable for that bot's room
lifetime. Default names are the lowest unused `Bot 1` through `Bot 5`.
Removal followed by re-addition creates a new ID. Bots have default visual
equipment and no collection ownership or editable names in this release.

Human `roomMemberships`, `activeRoomMemberships`, authentication, socket control
and invitation permissions remain human-only. Add `RoomView.bots` separately
from its human `members`. A bot has no controller or connection flag and is not
displayed as reconnecting merely because it has no socket.

For poker participants, add `kind: 'human' | 'bot'`. Retain the existing
`accountId` field as a legacy opaque poker actor key for this release: for a
human it is the real account ID, for a bot it is the namespaced bot ID. This
compatibility choice avoids renaming every engine, payout and history identifier.
The name must never be treated as proof of account identity: filter by `kind`
before account authorization, equipment reads, active-account locks or economy
operations. Historical participants without `kind` normalize to `human`.
Do not infer a human's permissions from a bot ID supplied in a client payload.

New commands extend the existing strict discriminated room-command union:

| Command | Payload beyond existing mutation metadata and room ID |
|---|---|
| `room:addBot` | `seat` (integer 0–5), `controlEpoch` |
| `room:removeBot` | `botId`, `controlEpoch` |

Use current `commandId`, `authorityBootId`, `issuedAt`, deduplication, canonical
payload hashing, host/controller checks, queue limits and rate limits. Return a
normal `RoomReply`; publish a new room revision after commit. Allocate bot ID/name
once outside retryable transaction callbacks. Identical retries return the
recorded outcome; changed payloads with the same ID conflict.

Add/remove requires an open waiting room, current human host and its controlling
tab. Require an empty union seat across human memberships and the room bot array.
All join, seat movement, add/remove and session-start paths use the same room
queue plus fenced transaction/revision checks. Preserve the existing human seat
index; do not claim it enforces bot occupancy. A racing human join and bot add
must leave exactly one occupant. Six total occupied seats means full.

One to five bots are possible depending on human occupancy. There must be at
least one human and two total seated players to start. Starting freezes the
roster. New human joins still follow current session restrictions; they never
silently replace a bot. Bots never receive host transfer or count as a connected
human. Closing a room removes its bot roster with the room lifecycle.

## 5. Frozen session mode, persistence and economy

At authoritative start, derive and persist `mode: 'standard' | 'practice'` from
the frozen roster, not from a client option. Any bot means practice. Sort combined
participants by seat and persist `kind`, stable actor IDs and stacks in that order.
Only humans participate in active-account admission locks and equipment lookups.
Bots still count toward the six-player and existing global session limits.

Propagate mode through runtime, settlement candidates and public game/hand/session
results. Include it in settlement identity/hash. Existing records lacking mode
normalize to `standard`; existing reward policy versions remain intact. New
practice sessions carry no earning policy, but absence of that field is not the
sole security check. Persisted mode is authoritative and immutable.

Before any wallet preparation or reward write, settlement verifies candidate
mode/roster against the durable session. A practice session skips all wallet
creation/revision changes, daily earnings, reward receipts and ticket ledger
writes. It still atomically commits the hand result and updated session stacks.
Reject a conflicting standard candidate or any standard roster containing bots.
Keep a defensive practice-mode guard in the reward boundary as well. Tests must
prove that even a practice candidate carrying a reward policy cannot earn.

Practice hands consume none of a human's daily allowance. Human manual actions
retain their normal engine bookkeeping; bot actions never enter the manual-human
list. Do not remove existing wallets or alter cosmetic purchases/equipment.
After ending a practice session and removing all bots in the waiting room, a new
standard session follows the existing human-only reward rules.

Prepare a new versioned migration, expected `007-bot-players.ts`, to validate bot
rosters, participant kinds and session modes while accepting legacy documents.
Register it in `database/migrate.ts`; do not edit historical migrations to apply
new behavior to already-migrated installations. Compatibility adapters normalize
old results before strict public schema validation. Backfills are unnecessary:
all pre-feature sessions and participants are standard/human. Exercise old and
new records on an isolated replica set. Applying this migration to a hosted
database remains separately authorized work.

## 6. Casual strategy and fair information

Build a typed immutable observation containing only the bot's two cards, public
board, street, public positions/stacks/contributions/folds, visible pot size,
blinds, and authoritative legal actions. It contains no deck, deck position,
other players' hole cards, unrevealed folded cards or random shuffle state.
Use a separate injected randomness source for strategy and delay decisions.

Initial tuning defaults for the single casual strategy:

| Situation | Default behavior |
|---|---|
| Strong preflop | Pairs ten or higher, or an ace with queen/king. |
| Medium preflop | Other pairs, other ace hands, two cards ten or higher, or suited consecutive cards with the lower card at least five. |
| Strong postflop | Current made hand is two pair or better. |
| Medium postflop | One pair, exactly four cards of one suit, or a four-rank open-ended straight draw. Treat ace low/high consistently; exclude gutshots. |
| Otherwise | Weak; check when free and normally fold facing a bet. |

Evaluate strong before medium. Use existing card encoding/evaluation helpers.
On each decision use one injected uniform sample: strong hands raise on 65% of
decisions when legal, otherwise check/call; medium hands check when free and call
only if the call is at most one-third of the public pot and 15% of the bot's
remaining stack; weak hands facing a bet call on 10% of decisions only when the
call is no more than one big blind. Weak hands with a free check make a legal
minimum-raise bluff on 5% of decisions, otherwise check.

For a strong raise target, add half the public pot, rounded down to whole chips,
to the current bet, then clamp to the legal raise range. Respect a short-all-in
only target exactly. When no valid raise/call exists, check if allowed, otherwise
fold. The authoritative engine validates every selected action again. These
heuristics define a casual opponent, not a claim of strategic strength.

Calculation is bounded arithmetic plus the existing evaluator; do not enumerate
opponent hands, run unbounded simulations or call a network model. If strategy
throws or returns an invalid action, make one legal check/fold fallback for the
same still-current turn and record only a nonsensitive diagnostic.

## 7. Turn scheduling, cancellation and pauses

Schedule one bot action 1,000–3,000 ms after its turn begins using injected
`GameClock` and randomness. Keep one logical action path per turn; retain the
existing 30-second safety deadline as a backstop. Do not sleep inside a room queue
or hold a transaction open during thinking time.

Build the observation and choose the pending action once when scheduling the
turn. Store that action and the sampled delay with the turn identity; pause/resume
does not reroll either. Revalidate the stored action against current legal options
before applying it, even when its game version still matches.

Every callback re-enters the room queue and verifies room existence/open phase,
authority boot and lease epoch, session/hand IDs, game version, actor, due time,
and a scheduling generation. It also verifies bot kind, active betting state,
and absence of human-presence/settlement pauses. After a successful transition,
cancel both that turn's bot timer and safety timer. Human and bot transitions
share the existing accept, chip validation, settlement and publisher paths.

Cancel stale work on actor/hand/session changes, pause, room closure, authority
loss, restart and application shutdown. Increment the scheduling generation on
cancel/resume so a previously queued callback cannot act after resumption. A
duplicate or late callback is a no-op, never a second action or a recreated room.
Bot timing does not skip the existing five-second hand-result interval.

### No humans connected

For practice sessions, a connected human means a current human room member with
at least one authenticated, authorized room socket; an observer tab counts.
Bots never count toward this presence or the empty-room cleanup timer. Host
transfer still chooses only humans.

When presence becomes zero, serialize a presence-pause transition. Freeze bot
thinking, human turn deadlines and next-hand/result transition countdowns;
cancel their callbacks and preserve remaining active-play time. Use a separate
presence flag from the existing settlement-failure `paused` flag. Never deal or
apply timeout actions while presence-paused. Preserve the existing two-minute
room retention deadline, which continues in wall-clock time.

An already completed hand must still commit its frozen settlement, including
bounded retry handling, while no humans are connected. That commit cannot deal
another hand or unpause gameplay. If it commits during the pause, retain the
full result-display interval for resumption. Failed settlement remains governed
by current durable-result safety: never discard an uncommitted completed hand
merely to satisfy a two-minute cleanup target. Record this outage case honestly
and close after the pending settlement is resolved.

If a human reconnects before cleanup, cancel empty closure and resume countdowns
from their saved remaining duration only after existing session/member validation
and sync. Do not resample bot strategy or grant an automatic new human action.
If retention expires, abort the still-unfinished session through existing cleanup,
preserve committed hands, remove room runtime and cancel every timer. Ordinary
restart behavior still aborts interrupted sessions rather than restoring a deck.
Standard human-only sessions keep their existing disconnect behavior.

## 8. Session ending and user interface

At each successfully committed hand boundary, end for host request, fewer than
two funded players, or no funded humans. Add `NO_FUNDED_HUMANS` to session-end
reasons and use one shared end-condition helper for authority and
`GameView.nextTransition`, so the five-second countdown predicts the real outcome.
If conditions overlap, use host request first, then no funded humans, then one
funded player. No mid-hand truncation, practice rebuys or bot-only next hands.
Standings include all players and may correctly show bots as leaders.

Waiting-room UI provides an Add bot action on each empty seat and a Remove bot
action on bot seats. Only the controlling host tab can use them. Disable controls
while pending/unavailable and preserve current uncertain-command retry/sync
behavior; never retry under a new command ID automatically. Reconcile roster
updates from authoritative snapshots for everyone in the room.

Show a persistent `Practice · No tickets` notice before start and during play,
and explain `Remove all bots before starting to earn tickets.` Show obvious Bot
labels in the room, table, results and history. Bot turns may show `Thinking…`
without inventing action certainty. Never expose bot cards before normal showdown.
Practice result UI explains why no tickets were earned instead of showing a
missing receipt, reward error or a misleading daily-cap message.

Ended sessions preserve bot seats in the room lobby. Start again resets all
stacks equally; host may first add/remove bots. Keep current invited-human seat
rules, account controls, default cosmetics, keyboard navigation and responsive
table layout. No new settings page, bot personalities, difficulty selector,
chat, spectator product or art-generation task is included.

## 9. Verification and acceptance

This is a specification, not test evidence. No bot acceptance checks have run.

| Area | Required evidence before implementation completion |
|---|---|
| Contracts and compatibility | Strict command validation; human/bot discrimination; mode/result parsing; legacy rooms/results default correctly; new mode/kind survives history. |
| Roster and permissions | Only controlling host adds/removes; six-seat limit; add/join/move/start races; exact retries and conflicting IDs; all mutations rejected during play. |
| Strategy and privacy | Deterministic seeded decisions; tier/draw edges; legal short all-ins and raise clamps; illegal-output fallback; observation excludes secrets; changing hidden cards/deck cannot change a decision given identical observation/randomness. |
| Runtime and lifecycle | One human + 1–5 bots completes real hands; at most one action per turn; 1–3 second scheduling; stale callbacks, bot/human deadline race, authority loss and shutdown; pause/resume, cleanup, pending settlement and all-humans-bust ending. |
| Persistence, economy and UI | Real replica-set practice settlement/retry leaves wallets, daily counters, ledgers and receipts unchanged; no bot account/lock/equipment side effects; later standard rewards still work; real Socket.IO and Playwright solo/mixed/takeover/reconnect/results flows at 360px and 1440px. |

Use the pinned pnpm and frozen workspace lockfile. Existing configured checks
are `pnpm check` (typechecks, tests and builds), server Jest, web Vitest and
`pnpm --filter @poker/web test:e2e`. No lint script exists on this baseline.
Implementation must also inspect the current CI Worker-build result; prepare
and apply migrations only to isolated local test data for verification.

Documentation verification for this task is repository accuracy, self-review,
link review and `git diff --check`; application tests are unnecessary until
executable code/configuration changes. Publish planning work in a PR targeting
`dev`, with the user merging manually. The
[implementation plan](../plans/2026-10-15-bot-player-implementation.md) now covers
the approved specification. Application execution follows plan review.
