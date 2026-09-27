# Checkpoint — M0/M1 production implementation

Updated: 2026-09-27. Status: Tasks 1–2 complete on `codex/m0-m1-foundation`; ready for Task 3 persistence work.

## User intent and usage rule

The user approved the M0/M1 implementation plan and requested inline execution. Work is limited to local implementation and deployment preparation; no cloud provisioning, live secrets, or production database operations are authorized. Save this checkpoint at every task boundary and whenever either remaining usage window drops below 6%. Latest execution-start reading: five-hour remaining 39%, weekly remaining 91%. Never purchase or consume reset credits automatically.

## Active execution

- Branch: `codex/m0-m1-foundation`, created from fetched `origin/dev` at `01f033d0`.
- Plan: `docs/superpowers/plans/2026-09-26-m0-m1-production.md`.
- Completed tasks: Task 1, bootable workspace and shared contracts; Task 2, approved responsive application shell.
- Current task: ready to begin Task 3, persistence and transaction foundations.
- Next action: begin Task 3 with the first failing disposable replica-set and transaction tests, then add MongoDB configuration, migrations, validators, indexes, and a single-session transaction runner.
- Verification: `pnpm check` passed all workspace typechecks, 8 tests, and Nest/contract/Next production builds. `pnpm --filter @poker/web test:e2e` passed 4 Chromium tests covering 360×800, 900×900, 1440×1000, Escape closure, and focus restoration. The Impeccable detector returned no findings after remediation. `git diff --check` passed with line-ending warnings only.
- Deferred environment check: `pnpm --filter @poker/web build:worker` completed the Next build but Windows denied OpenNext's required pnpm symlink during server packaging. Re-run this in Linux CI during Task 10; do not claim the Worker bundle passed locally.
- Usage at checkpoint: five-hour remaining 74%, weekly remaining 80%. No reset credit was used.
- Blockers: none for Task 3; Linux CI is required for final OpenNext bundle evidence.

## Task 2 implementation evidence

- Ported the approved blue/white lobby into the Next.js App Router application with real semantic actions, a compact responsive companion treatment, design tokens, Lucide icons, and documented provisional artwork provenance.
- Removed prototype-only balances, unfinished navigation, demo invitation codes, query-string invitations, and functional poker claims from the production shell.
- Added accessible modal messaging for the intentionally not-yet-connected room actions. Native Escape handling closes the dialog and restores focus to the initiating action.
- Added colocated Vitest behavior coverage and isolated Playwright browser coverage. Visual screenshots at all three required viewports showed no horizontal clipping and retained action-first hierarchy.

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

## Previous prototype and resume guidance

The prototype is complete within its demo scope and the user said it looks good. The visual direction is sufficient for implementation planning; the remaining screens receive milestone-specific reviews as they are built.

Read docs/superpowers/plans/2026-09-26-design-to-production.md next. It integrates the approved design into the existing plan.md section 19 without duplicating backend work. M0/M1 tasks are detailed; M2–M5 are a dependency roadmap requiring their own executable plans after relevant proposed rules are resolved.

Important production differences: 24-character room titles (prototype allows 40); secure fragment invitation tokens (prototype six-character codes/query-string links are demo only); no fake ticket balance or unfinished production navigation before its milestone. Tasks B–E expand existing frontend task 9, not a second competing implementation.

Confirmed M1 decisions replace the older proposals: invite-only email/password with no outbound email, participant-only room access, and explicit tab/device takeover. The repository is no longer an untracked planning checkout; the reviewed design and prototype are committed on `dev`. Resume from the first incomplete task recorded above and trust the execution ledger plus Git history over conversational memory.
