# Checkpoint — interactive lobby prototype

Updated: 2026-09-26. Status: prototype reviewed; design-to-production implementation plan written for user review.

## User intent and usage rule

The user approved the visual direction and interactive lobby prototype, then requested the next design step or an implementation plan if the design was ready. The plan has now been written; production implementation has not begun. Save a checkpoint whenever remaining usage drops below 6%. A previous turn stopped at 3% and later resumed after reset. Latest reading at the start of the planning turn: five-hour remaining 58%, weekly remaining 93%. Never purchase or consume reset credits automatically.

## Approved direction

Read design.md and docs/design/approved-theme-v4.png. Blue Archive-led white/blue UI, small supporting character, restrained Genshin celestial gold accents and Wonderland mirror, watch, rabbit, tea and checkerboard details. Earlier dark moonlit concepts are superseded. Looking Glass Club and Alice remain provisional names.

## Completed deliverable

Static interactive prototype in prototype/. Start from the repository root with:

```powershell
node prototype/server.cjs
```

Preview: http://127.0.0.1:4173. Server binds to localhost only. It was running in exec session 62774 at this checkpoint; verify availability before restarting. Browser deliverable tab was left on the lobby with viewport override reset.

Files:
- prototype/index.html: lobby, room dialogs, waiting room, collection and invitation preview screens.
- prototype/styles.css: desktop/tablet/phone layouts and reduced-motion styles.
- prototype/app.js: local create/join validation, sample invitation TEA123, copy-link feedback, navigation and dialogs.
- prototype/server.cjs: dependency-free local static server.
- prototype/assets/hostess.png: original generated character illustration.
- prototype/README.md: startup instructions, scope limits, art provenance and exact generation prompt.
- docs/design/lobby-prototype-plan.md: completed task list.
- docs/design/lobby-prototype-review.md: verification results and limitations.

## Evidence and fixes

Browser checked: blank room-name rejection, literal HTML-like names rendered safely, created host waiting room, sample guest waiting room, malformed/unknown/external invitations rejected, same-origin invitation URL accepted, copy success, preview navigation, ticket information, Escape handling and focus return. Browser warning/error log was empty during the exercised flows.

Inspected 1440 px desktop and 360 px phone; measured 900 px intermediate layout. Fixed desktop overflow from the decorative orbit. All three widths have no horizontal document overflow. Phone dialog fits within viewport. Added descriptive ticket-button accessible name and minimum touch sizes. Simplified repetitive slogans into concrete action copy.

Node syntax checks and local asset-reference checks passed. Original plan.md remains unchanged. See the review document for what was not exercised (clipboard-denial fallback, OS reduced-motion setting, exhaustive accessibility/cross-browser checks).

## Boundaries

No real backend, authentication, multiplayer, poker engine, economic transactions, or pulls. Sample balances and rooms are local demo data. Collection and Invitations are descriptive preview screens. This prototype does not replace the planned Next.js/NestJS production architecture.

## Resume guidance

The prototype is complete within its demo scope and the user said it looks good. The visual direction is sufficient for implementation planning; the remaining screens receive milestone-specific reviews as they are built.

Read docs/superpowers/plans/2026-09-26-design-to-production.md next. It integrates the approved design into the existing plan.md section 19 without duplicating backend work. M0/M1 tasks are detailed; M2–M5 are a dependency roadmap requiring their own executable plans after relevant proposed rules are resolved.

Important production differences: 24-character room titles (prototype allows 40); secure fragment invitation tokens (prototype six-character codes/query-string links are demo only); no fake ticket balance or unfinished production navigation before its milestone. Tasks B–E expand existing frontend task 9, not a second competing implementation.

Next after plan review and user instruction to implement: resolve existing M1 proposals for Google-only sign-in, participant-only access, and one controlling tab; prepare/reuse a managed implementation worktree and the planned codex/m0-m1-foundation branch; explicitly copy the uncommitted design/plan/reference artifacts into it; execute original foundation task 1. Inline execution is recommended. Preserve the dev checkout and codex/system-design plan-only branch. No new application code was added in this planning turn.

Current checkout: dev. No commits, pushes, deployments, or worktree changes were performed. Design, prototype and checkpoint files remain untracked/uncommitted; preserve them. Check usage when resuming and at work milestones, saving this checkpoint below 6%.
