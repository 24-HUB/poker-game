# Poker Room — UX/UI Implementation Specification

User-supplied specification, 2026-10-11. This is the acceptance source for
[M5.1a Task 2](../plans/2026-09-30-m3-through-production.md#task-2--playing-room-hierarchy-and-usable-controls).
Implemented and locally verified on `codex/m5-predeploy-ux`, 2026-10-12. Required
responsive/own-turn geometry checks and full local CI-mode Chromium pass.
See `CHECKPOINT.md` for scoped evidence; remote new-head CI and hosted acceptance
are separate gates. The requirements below remain the acceptance source.

Apply the existing design system and theme. The reference image defines layout and interaction only.

## 1. Scope

Redesign the poker room to make game state, player information, and available actions easy to understand.

Reuse existing colors, typography, components, icons, spacing tokens, and visual styles. Do not introduce a new theme or change poker rules.

## 2. Page layout

Arrange the screen in this order:

1. Compact application header.
2. Room information and controls.
3. Poker table and player positions.
4. Player action panel.
5. Collapsible hand history.

The table and action panel must remain visible together on standard desktop screens. Reduce decorative space before reducing card or text readability.

## 3. Room information

| Element | Requirement |
| --- | --- |
| Back navigation | Provide a clear route to the lobby. |
| Room title | Display the actual room name prominently. |
| Game details | Display hand number, current phase, and blinds. |
| Connection | Show a text label and status indicator. |
| Room controls | Group secondary controls in a room-options menu. |
| Leave room | Keep separate from gameplay actions. |
| End after this hand | Preserve the existing host control and visibly indicate when enabled. |

Collapse application navigation during gameplay while keeping destinations accessible.

## 4. Poker table

- Position the current player at the bottom.
- For two players, position the opponent at the top.
- If additional seats are supported, distribute them around the table perimeter.
- Keep seat positions stable throughout a hand.
- Place community cards and the pot in the center.
- Before cards are dealt, show subtle empty community-card slots.
- Place each player's current bet near their seat, toward the center.
- Avoid overlapping player information, cards, bets, and the board.

## 5. Player information

Each occupied seat displays:

- Player name, with **“You”** identifying the current user.
- Remaining chip stack.
- Hole cards, visible or concealed according to existing game state.
- Dealer and blind markers where applicable.
- Current action or status, such as **Folded**, **All-in**, or **Disconnected**.

Highlight the active player with both a visual treatment and a text/timer cue. Do not rely on color alone.

Keep **remaining stack**, **current bet**, and **total pot** visually distinct.

## 6. Action panel

Keep the panel below the table in a consistent location.

| Control | Behavior |
| --- | --- |
| Turn indicator | Show “Your turn” and remaining time; otherwise show whose turn it is. |
| Fold | Use a readable secondary action; it must not appear disabled when available. |
| Check / Call | Display the legal action dynamically. Include the amount for Call. |
| Bet / Raise | Display the appropriate action and the selected amount. |
| Amount input | Allow direct numeric entry. |
| Amount slider | Synchronize with the amount input. |
| Presets | Update the selected amount without immediately submitting an action. |

### Amount behavior

- Clearly distinguish **“Raise to”** from an additional raise amount.
- Obtain legal minimum, maximum, and increments from existing game logic.
- Validate invalid amounts inline and disable submission until valid.
- Do not hard-code the reference image's amounts or timer.
- Preserve entered amounts during ordinary updates; revalidate when legal limits change.

### Submission behavior

- Enable actions only when permitted.
- Prevent duplicate submissions while an action is pending.
- Show submission feedback.
- If submission fails, display a clear error and refresh available actions.

## 7. Responsive behavior

**Desktop:** Full table, compact navigation, and horizontally arranged action controls.

**Tablet:** Collapse navigation and tighten spacing while preserving card readability.

**Mobile:** Use a compact table layout and a bottom action panel. Keep the user's cards and essential game state visible above the panel. Avoid horizontal scrolling and account for device safe areas.

## 8. Supporting states

- **Waiting:** Explain that the room is waiting for players.
- **Opponent's turn:** Keep the panel stable; disable unavailable actions.
- **Reconnecting:** Show connection feedback and prevent stale actions.
- **Hand complete:** Clearly identify the winner and result.
- **Hand history:** Open on demand without navigating away from the room.
- **Leaving:** Confirm only when leaving has consequences for an active hand.

## 9. Acceptance criteria

- Users can immediately identify their cards, stack, the pot, and whose turn it is.
- Primary actions remain visible without scrolling on supported desktop sizes.
- Cards, player labels, and controls do not overlap at supported breakpoints.
- Legal actions and amounts reflect the existing game state.
- All controls support keyboard use, visible focus, and accessible labels.
- Timer updates do not trigger excessive screen-reader announcements.
- The implementation uses the existing design system throughout.

## Integration with the current-room requirement

Keep the earlier active-room recovery/navigation protection in M5.1a Task 1.
During gameplay, destinations remain discoverable in the collapsed navigation;
selecting **Back to lobby** or another destination starts the explicit leave flow
before navigation. Confirm only when leaving affects an active hand. Cancel keeps
the room and selected betting amount intact; a failed leave remains in the room.
Waiting/finished states can return to the lobby without an unnecessary confirmation.
Direct routes/Back/reload still recover active membership; sign-out and account
recovery remain accessible. This gives a deliberate exit without losing the table.

Hand history means completed-hand results, not a new action-replay system. Read
existing committed results with membership checks and the same private-card and
account-specific reward filtering as live projections. Do not fabricate missing data.
