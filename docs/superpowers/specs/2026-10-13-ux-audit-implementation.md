# UX/UI audit — implementation handoff

Date: 2026-10-13 (Asia/Bangkok). Status: **audit complete within the scope below;
fixes proposed, not implemented or verified**. The user requested this Markdown
handoff for subsequent implementation, not immediate application changes.

## Scope and constraints

Improve onboarding, private-room entry, waiting-room usability, collection
guidance, and the poker table. Preserve the existing visual identity, authoritative
backend, poker rules, ticket economy, cosmetic catalogue, and privacy guarantees.
Use `plan.md`, `DESIGN.md`, `PRODUCT.md`, and the existing
[poker-room specification](2026-10-11-poker-room-ux-ui.md) as constraints. This
audit adds regression targets; it does not invalidate earlier scoped test results.
Implementation choices below are recommendations pending reproduction and design
resolution, not newly approved product rules.

## Evidence and limits

- Live review: https://poker-game.nearyou1474.workers.dev/ — signed-out lobby,
  sign-in/registration/recovery presentation, signed-in collection and pulls,
  creation of a temporary waiting room, takeover, and leaving that room.
- Local review: current `origin/dev` baseline `502d50e8`, two disposable verified
  accounts in separate in-app-browser and Chrome sessions, real Socket.IO and the
  documented loopback MongoDB replica-set harness. No production data was used
  for the two-player gameplay review.
- Observed successful copied-code joining, call/check actions across betting
  rounds, rejected out-of-range amount, subsequent hands and ticket updates,
  hidden opponent-card UI, and host transfer following a disconnect. This is
  observational evidence, not a complete poker/privacy/economy regression suite.
- Live viewports included 1440x900, 390x844 and 360x800. Local desktop was
  1440x900. Chrome's requested 390x844 override reported an effective CSS viewport
  of 355x767 during measurement; reproduce using measured viewport dimensions.
- Impeccable source detector: `detect.mjs --json apps/web/src` returned `[]`.
  Static detector success does not validate interaction quality or accessibility.
- Session-end verification was blocked: native `window.confirm` stalled browser
  automation in both browsers. The host disconnected during the stalled attempt;
  after user intervention, play continued and host controls had transferred.
  Do not conclude from this that ordinary users cannot end sessions, or claim
  successful end-session acceptance. Reproduce independently.
- Not verified: six-player layout, side pots/all-ins, real phone keyboards,
  comprehensive keyboard/screen-reader or contrast compliance, performance
  benchmarks, full reconnect matrix, and production multiplayer acceptance.
- Local services were stopped, temporary browser sizes restored, and generated
  tracked-file drift reverted after the review.

Screenshots remain **local, ignored artifacts**, not versioned evidence:
`apps/web/.artifacts/ux-audit/mobile-turn.jpg` and `desktop-table.jpg`.
The mobile capture shows the action panel overlapping the lower private-card area.
They may not exist in another checkout; regenerate when implementing. Never
commit credentials, invitation tokens, account data, or real private-card captures.

## Prioritized implementation backlog

### UX-01 — P1: Keep private cards visible with active mobile controls

Observed: the expanded betting panel covers the lower portion of the local
player's cards on the narrow mobile table. Waiting-state controls occupy less
space, so checking only the waiting state misses the issue.

Inspect `apps/web/src/app/globals.css`, `features/rooms/PokerTable.tsx`, and
`features/rooms/PokerActionPanel.tsx` under `apps/web/src`.

Proposed change: reserve layout space for the complete active action panel and
adapt table height/spacing; do not solve overlap by shrinking ranks or hiding
legal controls. Preserve safe-area and reduced-motion behavior.

Acceptance:
- [ ] Both private cards, board, pot, turn/deadline and primary legal actions are
  simultaneously readable at 360x800 and 390x844, plus effective 355x767.
- [ ] No card/action-panel overlap on own turn, opponent turn, invalid amount,
  result transition, or reconnect banner. Verify geometry and screenshots.
- [ ] Short-height and keyboard-open layouts retain reachable controls without
  horizontal overflow. Test physical-phone behavior separately where available.
- [ ] Desktop 1440x900 remains readable; include six-player coverage before release.

### UX-02 — P1: Preserve control through ordinary create/join entry

Observed on live and local: host and guest enter as watching tabs after normal
creation/join, then must select **Use this tab to play** before acting.

Inspect `LobbyExperience.tsx`, `RoomExperience.tsx`, `useRoomConnection.ts`,
`ActiveRoomBoundary.tsx`, and backend room controller ownership/fencing.

Proposed change: investigate the lobby-to-room connection lifecycle and preserve
the controlling connection or authorized continuity. Do not blindly take over on
every mount: existing competing-tab and reconnect protections must remain intact.

Acceptance:
- [ ] Fresh host creation and guest joining in independent sessions lead to usable
  seats without an unexplained extra takeover step.
- [ ] A second tab never silently steals control; explicit takeover disables the
  previous controller, including after a late old-socket disconnect.
- [ ] Genuine observer mode explains why, with a prominent takeover action.
- [ ] Verify navigation, refresh, reconnect, retries and host transfer using real
  clients. Do not infer a backend ownership fix from UI-only mocks.

### UX-03 — P1: Put mobile waiting-room actions before seat decoration

Observed: at 360x800, **Copy invite code** begins around document y=1182, below six
large seat cards; takeover/start controls are similarly buried.

Inspect `RoomLobby.tsx` and its responsive CSS. Put sharing, start/waiting status,
connection state and any takeover action above a compact seat roster.

Acceptance:
- [ ] First phone viewport clearly presents the next useful host/guest action.
- [ ] Host can copy an invitation without scrolling through six empty seats.
- [ ] Start explains missing players; guest sees waiting-for-host status.
- [ ] Joining, full-room, disconnected and long-name states remain understandable.

### UX-04 — P2: Keep join errors inside the open form

Observed: empty/malformed input stays in the form with validation. A syntactically
valid but invalid/expired code closes the form before showing the server error.
The code remains when reopened, but correction requires another click.

Inspect `Lobby.tsx` (`submitJoin` calls `returnToActions` immediately) and
`LobbyExperience.tsx`. Keep the form open through pending/error outcomes; return
or navigate only after confirmed success. Preserve uncertain-command identity.

Acceptance:
- [ ] Empty, malformed, expired/rotated, unavailable/full room and transient
  failure cases retain input, show contextual errors and support correction.
- [ ] Pending state prevents repeated submission; no premature success view.
- [ ] Keyboard focus and announcements reach the error; back/Escape still work.
- [ ] Successful copied-code joining enters the correct room exactly once.

### UX-05 — P2: Contextual authentication and signed-out destinations

Observed: signed-out Collection and Invitations both show the unrelated sentence
**Sign in to enter a private room.** Creation requests a title before revealing
that sign-in is needed. Inspect `SessionBoundary.tsx`, `SignInButton.tsx`, and
`LobbyExperience.tsx`.

Acceptance:
- [ ] Each protected destination retains its heading and a relevant explanation
  plus inline sign-in action.
- [ ] Create/Join identifies the sign-in requirement at a useful point and resumes
  the intended task. Preserve drafts and pending invitations through sign-in.
- [ ] Cancel, failed sign-in, verification, expired invitation and backend-starting
  states do not lose context or misrepresent authentication state.

### UX-06 — P2: Consistent terminology, feature status and avatar identity

Observed: lobby says cosmetics **arrive later**, although collection/pulls exist;
**Invitations** is ambiguous beside room invitations; collection's generic
**Club default** differs from Alice in the lobby's equipped-character preview.

Inspect `Lobby.tsx`, `components/shell/GameShell.tsx`,
`components/shell/CompanionPortrait.tsx`, and `features/collection/Collection.tsx`.

Acceptance:
- [ ] Remove stale feature-status copy; explicitly distinguish cosmetic pulls
  from room invitations across navigation, headings and links.
- [ ] Resolve whether Alice is a hostess or the default equipped avatar. Reflect
  the chosen truthful identity consistently without inventing ownership.
- [ ] Verify **Rooms expire after 24 hours** against actual room lifecycle;
  inspected backend uses 24 hours for invitation expiry. Correct the noun/rule
  after confirmation instead of asserting an unverified room lifetime.
- [ ] Preserve the existing theme and factual economy values.

### UX-07 — P2: Give zero-ticket players a useful next action

Observed: pull buttons are disabled with **qualifying poker hands** guidance but
no immediate play CTA or concise qualification explanation.

Acceptance:
- [ ] Provide a context-aware route to lobby/current room, respecting live-play
  navigation rules, without bypassing explicit leave behavior.
- [ ] Explain existing rules concisely: qualifying manual action, participation
  ticket, positive-net bonus and remaining UTC allowance. No new reward policy.
- [ ] Keep prices, duplicates, guarantees and insufficient-balance feedback clear.

### UX-08 — P2: Touch targets and mobile player identification

Observed: recovery links are about 19px high, seat buttons 36px high; Mock Host
and Mock Guest both truncate to **Mock ...** on the narrow table.

Acceptance:
- [ ] Recovery and seat actions have at least 44x44 CSS-pixel touch areas with
  adequate separation; retain visible keyboard focus.
- [ ] Player identity remains distinguishable; provide full-name access for touch
  and keyboard users, not a hover-only tooltip.
- [ ] Verify long names, text scaling and six-player layout without obscuring bets.

### UX-09 — P2: Match amount labels and draft behavior to the betting round

Observed: a **Bet 20** action still labels its field **Raise to**. An invalid
preflop draft of 1 persisted into later rounds, leaving **Bet 1** disabled until
corrected; invalid submission itself was correctly prevented.

Acceptance:
- [ ] Label opening bets **Bet amount** and raises **Raise to**, retaining clear
  total-versus-additional-chip semantics.
- [ ] Define deliberate draft retention/reset across turns and streets; avoid an
  unrelated stale invalid value silently blocking the next turn's bet action.
- [ ] Test call/check/bet/raise/all-in ranges, presets, integer validation and
  changed server bounds. No optimistic chip changes or repeated commands.

### UX-10 — Investigation: Session-end confirmation and reconnect

Do not classify the automation stall as a proven user-facing failure. Inspect
`RoomExperience.tsx` native confirmation and test independently with dialog-aware
automation and a manual browser. If replacing the native dialog, preserve explicit
intent, focus trapping/restoration, keyboard operation and server authorization.

Acceptance:
- [ ] Cancel continues play; confirm requests ending after the hand exactly once.
- [ ] Ending state is visible; settlement and session standings occur correctly.
- [ ] Disconnect/reconnect and host transfer do not produce stale actionable
  controls or a false successful-end message.

## Implementation sequence and verification

1. Reproduce UX-01/02/03 on current dev and add meaningful geometry/real-client
   regressions. Fix card visibility, controller continuity and waiting-room order.
2. Address UX-04/05 entry and error recovery; then UX-06/07 content and guidance.
3. Finish UX-08/09, resolve UX-10 evidence, and perform one bounded visual polish
   pass using Impeccable. Preserve product decisions; avoid a replacement theme.
4. Inspect actual manifests. Use pinned pnpm 10.33.0, frozen install, configured
   typechecks/tests/builds (`pnpm check` exists); there is no lint script currently.
   Run relevant Playwright flows and real Socket.IO checks. Use isolated replica-set
   data only. Record commands and results, including unavailable checks.
5. Review desktop/mobile together, fix observed defects in a batch, then perform
   at most one confirmation pass before handoff. Do not represent these audit
   observations as passing implementation acceptance checkboxes.

Follow repository Git rules: clean start, fetch before implementation/resumption
and final handoff, task branch from fresh origin/dev, explicit branch push, PR base
`dev`, manual owner merge. Do not automatically integrate upstream changes. No
deployment, production database operation or paid service is authorized here.

## Usage limits and mandatory save points

Observed **2026-10-13 12:25:03 Bangkok / 05:25:03 UTC**:

| Window | Remaining | Reset (Bangkok) | Reset (UTC) |
| --- | --- | --- | --- |
| Five-hour | 15% | 2026-10-13 17:12:41 | 2026-10-13 10:12:41 |
| Weekly | 87% | 2026-10-20 12:12:41 | 2026-10-20 05:12:41 |

On documentation resumption at **2026-10-13 18:39:48 Bangkok / 11:39:48 UTC**,
the five-hour window had **99% remaining**, resetting at **2026-10-13 23:39:47
Bangkok / 16:39:47 UTC**; the weekly window had **84% remaining**, resetting at
**2026-10-20 12:12:41 Bangkok / 05:12:41 UTC**. No billing or reset-credit action
was performed. These are historical readings, not a budget available to the next
session.

- Check `get_usage_limits` at each implementation start/resumption, task boundary,
  and before substantial implementation or expensive verification. Prefer all
  applicable `rateLimitsByLimitId` windows; remaining = 100 minus usedPercent.
- **If any applicable window is below 10% remaining**, tell the user and assess
  whether the next bounded step leaves enough capacity to verify and save. Prefer
  a save point before substantial work; do not treat the threshold as completion.
- Update existing `CHECKPOINT.md` and `plan.md` section 18 with branch/PR, last
  completed commit and step, pending changes, actual checks/results, blockers,
  exact next step/command, observation time, remaining usage and reset times.
  Do not create another checkpoint file or record unchecked work as verified.
- Commit/push task-owned work and update its PR against dev when possible;
  incomplete/unverified work stays draft. If remote saving is blocked, retain
  local work and give the precise blocker and resume command.
- On resumption, recheck usage and read both checkpoints before continuing.
  Never buy credits, redeem reset credits or change billing automatically.

## Resume instruction

Read this brief and the current checkpoints; check usage, working-tree state and
fresh origin/dev. Reproduce **UX-01 mobile own-turn card overlap** and **UX-02
create/join controller continuity** first. Application implementation is not started
by this documentation handoff; do not confuse the clean audit branch with a fix.
