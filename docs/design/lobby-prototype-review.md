# Lobby prototype verification

Date: 2026-09-26. Scope: local design prototype, not production multiplayer.

## Browser checks completed

| Check | Observed result |
|---|---|
| Create with whitespace-only name | Inline error; focus remains in the input |
| Create with `<b>Tea & friends</b>` | Waiting-room heading displays literal text, with no injected child element |
| Created waiting room | Six seats, local player marked Host · Demo; Start session disabled |
| Copy preview link | Success feedback displayed |
| Malformed join code | Inline format error |
| Unknown six-character code | Room-not-found feedback with sample invitation recovery |
| External URL | Rejected as invalid for this local preview |
| Sample invitation TEA123 | Waiting room opens; player marked Guest · Demo |
| Same-origin preview URL for TEA123 | Join succeeds on phone layout |
| Escape from join/create dialogs | Dialog closes; join flow returns focus to its originating button |
| Collection and Invitations navigation | Correct labeled preview screens become visible |
| Ticket information dialog | Explains sample balance; closing returns focus to ticket button |
| Browser warning/error log | Empty during the exercised flows |

## Responsive checks and fixes

Inspected desktop at 1440 × 1000 and phone at 360 × 800. Also measured the intermediate 900 px layout.

- Fixed horizontal desktop overflow caused by the rotated character-frame orbit. Final desktop document client/scroll widths both 1440 px.
- Phone client/scroll widths both 345 px with the browser scrollbar consuming the remaining viewport space; no horizontal page overflow.
- Intermediate layout client/scroll widths both 885 px within the 900 px viewport.
- Phone create dialog bounds were left 19 px and right 326 px, within the 360 px viewport.
- Added a stable accessible name to the mobile ticket button and at least 44 px control dimensions. Dialog close buttons are also 44 px wide.
- Simplified repetitive promotional copy into concrete action descriptions after the design detector reported one copy-style warning. No further detector pass was run.

Screenshots were inspected in the browser. A final full-page screenshot attempt failed in the browser capture tool; the documented screenshot alternative succeeded. Viewport overrides were reset, and the lobby tab was marked as the deliverable.

## File checks

- `node --check prototype/app.js` and `node --check prototype/server.cjs` completed successfully.
- Local HTML asset/style/script references resolve.
- `git diff --exit-code -- plan.md` confirms the original product plan remains unchanged.

## Limits of verification

These are browser-driven checks, not a committed automated regression suite. Clipboard success was exercised; the denied-permission fallback was reviewed in code but not forced in the browser. Reduced-motion CSS is present, but an OS preference change was not exercised. This is not a complete accessibility audit or cross-browser certification.

There is no backend, authentication, multiplayer synchronization, playable poker engine, ticket spending, or reward generation. Collection and Invitations remain explicitly labeled preview screens. The source remains uncommitted in the current dev checkout.
