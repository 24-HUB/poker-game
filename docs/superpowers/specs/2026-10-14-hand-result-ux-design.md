# Poker hand results — UX/UI specification

Date: 2026-10-14 (Asia/Bangkok)
Status: Proposed design for review; application changes are not implemented by this document.

## 1. Intent and scope

Help two to six friends understand who won, why they won, how chips changed,
which cards are public, and what happens next. Match the two user-supplied
references: a green table within the existing pale-blue/white application,
clear winner treatment, readable cards, and a structured result below the table.
This is an Operate surface: understanding the outcome takes priority over decoration.

Reference 1 shows a showdown and completed session. Reference 2 shows a win by
fold followed by another hand. Their names, balances, ticket amounts and artwork
are illustrative. The “Alternative: everyone folds” block is a design variant,
not another panel to show alongside a real showdown result.

Deliverable: this specification only. Retain poker rules, settlement accounting,
ticket policy, authorization, equipment, room navigation and existing active-hand
controls. Do not add manual card reveal, a next-hand command, or new rewards.
This supplements the [room specification](2026-10-11-poker-room-ux-ui.md).
[plan.md](../../../plan.md) governs product rules. The current green felt in
`apps/web/src/app/globals.css` and these references govern this table treatment;
the older navy-felt suggestion in DESIGN.md does not require recoloring it.

## 2. Current implementation and approach

Inspected baseline: `origin/dev` commit `7927a9c4`.

- `PokerTable.tsx` already provides stable seat positions, own cards, card backs,
  five board slots, connection state and a dismissible text result toast.
- Opponent seats currently render backs even when the committed result contains
  revealed cards; showdown details appear as text in the toast.
- `HandHistory.tsx` already loads committed history with account/room/session
  cache isolation, pagination, loading, empty and retry states.
- `committedHandResultSchema` exposes payouts, contributions, final stacks,
  winners and authorized reveals. It does not expose the board, outcome reason,
  hand ranks, best-five selections, fold street or per-pot awards.
- `game.service.ts` already schedules the result interval for five seconds after
  settlement, then advances or ends the session. That transition timestamp is
  not exposed by `GameView`; the existing `deadline` is not a next-hand contract.
- `projectGame` clears the board and own hole cards when the terminal session
  clears its live hand. A persistent final-board design therefore needs committed
  result data, not just a visual component change.

Three possible scopes: polish the toast (small but does not meet the reference),
replace it with a structured result and complete its data contract (recommended),
or redesign the entire room (unnecessary scope). Use the middle approach.

## 3. Page hierarchy

1. Compact header: Lobby, room title, hand number, readable phase, explicitly
   labelled blinds, connection status and room options. Display “Hand complete”
   for a committed hand and “Session complete” only after session completion.
2. Felt table: stable player seats, central pot label, community cards and one
   concise outcome line. Keep the local player at the bottom.
3. Persistent “Hand N result” panel: outcome badge and player breakdown.
4. Completion bar: hand/session state, personal confirmed ticket outcome and
   “View hand history”; eligible host sees “Start new session” after session end.
5. Expandable history, retaining the selected completed result while new hands run.

Do not show betting controls for a completed hand. Replace the dismissible toast
with the panel; do not show duplicate result summaries. Keep session standings
available below the final result, with the final-hand winner and session leader
clearly distinguished. No modal or forced scrolling on settlement.

## 4. Showdown

On committed showdown, render authorized revealed cards at each relevant seat.
Keep all other opponents' cards face down. Display the final stack from the
committed result and a gold crown plus “Winner” label for each awarded winner.
Clear acting timers and stale bet/action badges; retain useful identity markers.

Place “Final pot · {amount} chips” above the board. Beneath it show, for example,
“REI wins · Three of a kind, aces”. With multiple winners use “Split pot” or
“Multiple pot winners” and direct attention to the detailed breakdown.

The result panel includes:

- “Hand 5 result” and a “Showdown” badge.
- Winner avatar, name, award, hand name and five cards labelled “Best five cards”.
- Other revealed players' hand names and cards in secondary rows; folded or
  unrevealed players get an explicit status, never a guessed hand rank.
- A restrained gold outline on the cards forming the named combination. Show
  all five selected cards, including kickers; text states which kicker resolves
  an otherwise equal ranking. Do not rely on the outline to explain the result.
- For a straight, flush, straight flush or high-card hand, highlight the full
  selected five. For board-playing ties, explain “Both players play the board”.

Use the engine's deterministic best-five choice when equivalent selections exist.
On the felt, apply combination highlights only for a single selected winner;
for ties or different side-pot winners, keep individual highlights in their rows.
Never move seats to place the winner at the top.

## 5. Win by fold

Show “Pot awarded · {amount} chips”, “REI wins {amount} chips” and
“All opponents folded · No showdown”. Keep unrevealed winner cards face down.
The local player's own folded cards may remain visible, labelled “Only visible
to you”; they must not be included in another recipient's data or history.

Keep only the actual board dealt. Undealt positions stay empty with useful
“Flop”, “Turn” and “River” labels; never manufacture a full board. Folded status
uses readable text and a quieter treatment without making the player's cards
or name illegible.

The panel uses a “Won by fold” badge, the winner and award, and two backs labelled
“Cards not revealed”. Do not display “Best five”, a hand ranking or showdown
highlights. “WC folded on the flop” requires recorded public fold information;
otherwise use “All opponents folded”. A hidden pair is not evidence of a fold:
the server must explicitly identify the result reason.

## 6. Accounting and rewards

Show settled stack, award and net change as separate concepts:

| Label | Meaning |
|---|---|
| Stack | Committed final stack for that hand |
| Awarded | Chips awarded from pots; do not silently include an uncalled return |
| Net change | Payout minus contribution, using the server's accounting convention |
| Returned | Uncalled chips returned, if separately reported |
| Tickets earned | Caller-specific committed reward receipt, separate from chips |

Avoid an unexplained “(+1,552)” beside the stack. Prefer “Awarded 1,552 chips”
and, when supported, “Net +{amount}”. Do not call gross payout profit. Account
explicitly for returns if current payouts include them; resolve this in the
contract before implementing the label. Per-pot awards must reconcile with the
committed settlement, including ties, side pots and deterministic odd chips.

Example fixture: board A♦ K♣ 8♥ 5♠ 2♦; REI has A♠ A♥ and WC has K♠ Q♠.
REI's best five are A♠ A♥ A♦ K♣ 8♥; WC has a pair of kings. With starting
stacks of 1,000 each and contributions of 776 each, a 1,552 award produces
final stacks 1,776 and 224, and net changes +776 and -776. Do not copy the
reference's unrelated balances into this fixture.

Show “+1 ticket earned” only if the caller's receipt actually awards one ticket.
Distinguish zero reward, policy cap, and unavailable receipt using existing
reward semantics. A completed session must not award a second session bonus.
Do not show a winner or earned reward while settlement is uncommitted.

## 7. State and transition behavior

| State | Presentation and available action |
|---|---|
| Settling | “Confirming hand result…”; no definitive award, no active betting |
| Committed, continuing | Result panel and “Next hand in {n}s” status |
| Ending requested / fewer than two funded players | Result and “Finishing session…”; no promise of another hand |
| Session ended | Final result and standings; eligible controlling host may start a new session; others see “Waiting for host” |
| Paused / settlement retry | “Result confirmation paused”; preserve confirmed information and existing recovery UI |
| Reconnecting | Preserve the last confirmed result with reconnect status; disable mutations and suspend countdown claims |
| Aborted session | “Session interrupted”; no winner/reward for the aborted hand; earlier committed history remains accessible |

Retain the existing five-second server interval. Expose a server timestamp and
explicit next transition intent before displaying an exact countdown. Compute
remaining time against synchronized server time; never reset to five on remount
or reconnection. At zero show “Starting next hand…” until a newer snapshot arrives.
The browser does not deal cards or send an invented advance command.

Unlike the reference, the countdown is non-interactive status text, not a blue
button. Display one countdown in the completion bar; reserve the strong blue
button for an action the player can perform. Keep Start new session in one place.
Host, controlling-tab, connection, pending-command and room eligibility checks
continue to apply. Preserve existing uncertain-command retry identity.

On a new hand, remove prior winner highlights and the main result panel. History
retains the completed result so the five-second interval is not a reading limit.
An open history remains open; it does not pause the table. Announce a new hand
without stealing focus. Scope all state to account, room, session and hand;
older snapshots must not reintroduce a previous winner.

## 8. Visual and responsive requirements

Preserve the incumbent green felt, pale canvas, white result surfaces, cobalt
actions, navy text, red/black suits and equipped cosmetics. No new theme or image
generation is required. Gold belongs to winner emphasis, not every boundary.

- Desktop reference target: centered content up to about 1,200 px; 24 px outer
  gutters, 12–16 px between table/panel/footer, 16–24 px panel padding.
- Use existing 16 px body/control text, 14 px secondary text, 18–22 px result
  headings and tabular numbers. Card ranks and suits remain prominent.
- Desktop board cards approximately 64–72 by 88–96 px; hole cards approximately
  48–60 by 64–80 px. Best-five cards may be smaller but must stay legible.
- Two-player composition follows the references; three-to-six-player layouts
  preserve existing seat order with enough space for winner/status labels.
- At 768 px and below, stack result content; five best cards remain a readable
  row. Wrap footer controls and names. Do not shrink body text to fit.
- At 355–390 px widths, use 12 px gutters and board cards around 42–48 px wide
  where space permits. No horizontal page scrolling, overlapping seats, or fixed
  result/footer layer covering cards or controls. Use document flow and allow
  vertical scroll at short heights rather than clipping the result.
- Long names have a keyboard/touch-accessible full-name disclosure; chip amounts
  use locale formatting and remain readable at supported maximum values.

All controls have at least 44 px touch targets and visible keyboard focus.
Normal text requires 4.5:1 contrast, large text and essential UI graphics 3:1.
Use dark text on gold badges; winner, fold and connection meaning use text/icons
as well as color. Card labels say full rank and suit, e.g. “Ace of spades”.
Hidden cards expose no rank through accessible names, DOM attributes or assets.

Announce one concise committed result through a polite live region, not every
row or countdown tick. History expansion reports state and has a labelled target.
Keep focus stable on new hands; if a removed control owned focus, move it to the
table heading without interrupting another focused control. Honor reduced motion;
optional 150–250 ms fades must not delay data, interaction or comprehension.

## 9. Proposed data and component work

These are implementation requirements, not existing API capabilities.

Extend committed public result data with a versioned presentation record:
`outcomeReason` (showdown/fold), `board`, publicly revealed players' ranking and
deterministic `bestFive`, combination-card identifiers, and pot-to-winner awards
with any separate returns. Add public fold street only if supporting that copy.
Preserve enough public participant identity to render history after room changes.
Do not persist or broadcast folded private cards to supply this presentation.

Keep own final hole cards, if retained for the reference's “Only visible to you”
view, in an authenticated recipient-specific projection. Clear them on sign-out,
account/room change and according to current retention rules; never add them to
the shared committed result. If unavailable after reload, omit them honestly.

Expose nullable `nextTransitionAt` and a next transition intent through GameView.
Set/clear these alongside the authoritative timer and ending/retry logic; the
turn deadline remains separate. Persist the public board before live-hand cleanup
so final-session refresh and history render consistently. Older records without
presentation data show existing awards plus “Detailed cards unavailable”; do not
infer a result reason, fold street or ranking from missing records.

Reuse `PokerTable`, `RoomExperience`, `HandHistory`, `HandReward`, shared contracts,
engine evaluation and the existing settlement/projection pipeline. Suggested
extractions: shared PlayingCard, WinnerBadge, HandResultPanel, ResultPlayerRow and
HandCompletionBar. Live results and history consume the same presentation model.
The backend computes outcome/ranking; the frontend formats authorized information.
This design does not authorize a production migration or deployment.

## 10. Acceptance and verification plan

The later implementation must demonstrate these cases; none are claimed tested
by this documentation task.

1. The example showdown displays three aces, correct best five, award, final
   stacks and net change consistently on table, panel and history.
2. A flop fold shows exactly three community cards, two empty slots, concealed
   opponent cards and no showdown/rank claim. Preflop and turn folds also work.
3. A caller's folded cards appear only in that caller's authorized view; another
   client and history response contain no folded private card identities.
4. A tie, board-playing tie, different side-pot winners, odd-chip split and an
   uncalled return all preserve accounting and avoid a false single winner.
5. Final-session result survives sync/refresh after live hand cleanup; session
   leader and last-hand winner can differ without misleading labels.
6. Countdown matches the server interval across rerender, background/resume and
   reconnect. Ending and bust-out paths do not promise another hand. Zero does
   not advance locally; the next authoritative hand clears stale highlights.
7. Pending/failed settlement, aborted hand, zero-ticket reward and unavailable
   history render truthful states. Duplicate snapshots do not repeat rewards.
8. Host/guest and controller/observer tabs retain existing mutation permissions;
   history remains readable during the next hand and handles retry/pagination.
9. Inspect 1440×900, 900×900, 390×844, 355×767 and 360×480 with two and six players,
   long names and large stacks: no overlap or horizontal page overflow. Verify
   keyboard, 200% zoom, reduced motion, four-colour suits and screen-reader labels.
10. Add meaningful contract/projection/settlement tests plus real two-client
    Socket.IO privacy/reconnect coverage and Playwright showdown/fold flows.
    Run the configured aggregate checks and relevant browser suites; transaction
    tests use only the isolated replica set. Record actual evidence at handoff.

## 11. Review decisions

Recommended defaults: persistent inline result, existing green felt, one
non-clickable server countdown, explicit award/net labels, no voluntary reveal,
and five-second continuation with accessible history. User review may refine
these choices. Implementation planning follows review of this specification;
the task does not mark any milestone or deployment complete.
