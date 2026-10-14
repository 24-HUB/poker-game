# Poker hand results implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, task by task.

**Goal:** Implement PR #29's approved showdown/fold result experience on its existing branch.

**Architecture:** Extend the pure engine's deterministic evaluation and settlement, persist an optional versioned public presentation with committed results, and project authoritative transition timing. Live table and history share card/result components; private hole cards stay recipient-specific.

**Tech Stack:** Existing TypeScript, Zod, NestJS/MongoDB, Next.js/React, Vitest/Jest and Playwright. No dependency changes.

**Spec:** `docs/superpowers/specs/2026-10-14-hand-result-ux-design.md`

## Global constraints

- Preserve the five-second server interval, poker/reward rules, green felt and existing permissions.
- No voluntary reveal, client advance command, production migration or deployment.
- Awards exclude uncalled returns; net remains payout minus contribution.
- Older committed records remain readable with “Detailed cards unavailable”.
- Continue `codex/hand-result-ux-spec`, push to PR #29 with base `dev`; owner merges manually.

## Review focus

- Folded cards must never enter public presentation/history.
- Returns, side pots, ties and odd chips must reconcile with settlement.
- Final board survives live-hand cleanup and refresh.
- Reconnect/ending/retry must not promise a new hand or restart the countdown.
- Six seats, long names and large amounts must fit narrow/short viewports.

## Task 1 — Public settlement presentation

**Files:** `packages/poker-engine/src/{evaluate,types,hand}.ts`, their tests; `packages/contracts/src/poker.ts` and tests; `apps/server/src/modules/settlement/settlement.service.ts`.

**Interfaces:** `evaluateSevenDetailed(cards)` returns rank, named combination, deterministic best five and combination cards. `EngineSettlement.presentation` contains public board, reason and revealed rankings; `CommittedHandResult.presentation` adds participant identity, pot awards and separate returns, version 1.

- [x] Add failing tests for three aces, board ties, fold privacy and returns.
- [x] Run focused engine/contracts tests and inspect RED.
- [x] Implement evaluation, settlement presentation and optional validated contract.
- [x] Run focused tests and inspect GREEN.

## Task 2 — Projection and server progression

**Files:** `apps/server/src/{projections/gameProjection.ts,modules/rooms/game.service.ts,modules/rooms/session.service.ts}`, `apps/server/test/{poker,poker-gateway}.e2e-spec.ts`.

**Interfaces:** `GameView.nextTransitionAt` and `nextTransition` expose the current server timer and next-hand/session-end intent. Result board comes from committed data after cleanup; own cards remain transient and private.

- [x] Add failing real-database tests for committed presentation/history, final cleanup, timer intent and privacy.
- [x] Implement timer lifecycle/projection; preserve atomic settlement and replay semantics.
- [x] Run poker/settlement/gateway suites against the disposable replica set.

## Task 3 — Table, result panel and history

**Files:** `apps/web/src/features/rooms/{PlayingCard,HandResultPanel,HandCompletionBar}.tsx`, `PokerTable.tsx`, `HandHistory.tsx`, related tests; `apps/web/src/app/globals.css`.

**Interfaces:** Shared panel consumes only `CommittedHandResult`; completion bar consumes `GameView`, connection state and existing start action. Table highlights only current committed winners and authorized cards.

- [x] Add failing component tests for showdown/fold, old data, accounting, countdown and stale-result clearing.
- [x] Implement inline result, revealed seat cards, full card labels and completion bar/history link.
- [x] Preserve focus, history selection, permissions, reward semantics and mobile document flow.
- [x] Run frontend suites; inspect desktop/mobile layouts with two and six seats.

## Task 4 — Acceptance and same-PR handoff

**Files:** `apps/web/tests/e2e/poker.spec.ts` and focused result browser coverage, existing `CHECKPOINT.md` and `plan.md` checkpoint.

- [x] Run meaningful Playwright fold/showdown, refresh/history and responsive acceptance.
- [x] Run `pnpm check`, inspect full diff and `git diff --check`.
- [x] Review correctness/privacy; fix required findings and repeat affected checks.
- [x] Record actual evidence, fetch origin, commit task files, push explicit branch and update PR #29.

## Execution decisions

- User explicitly requested implementation and pushing to the same PR; proceed inline under that authorization, without another design approval round.
- Presentation is optional for historical results and test candidates; all new engine-produced settlements supply version 1.
- No folded own cards are retained after terminal live-hand cleanup; omit unavailable private cards honestly.

## Verification ledger

- Engine/contracts regressions were observed failing before implementation, then passed.
- Real replica-set projection tests passed, including the exact three-aces reference and terminal board retention. Real Socket.IO fold/reconnect/history privacy passed.
- `pnpm check` passed: server 236/236, contracts 16/16, engine 21/21, script suites, typechecks and configured builds.
- Final frontend after review corrections: 144/144 tests, typecheck and production build passed. Full Chromium acceptance passed 28/28.
- Inspected two-player showdown and six-player fold at 1440x900, 900x900, 390x844, 355x767 and 360x480. The 200% zoom equivalent uses a 720x450 CSS viewport at pixel ratio 2; CSS zoom alone was rejected as an inaccurate media-query simulation.
- Reviewed and fixed committed-result retention while paused, removed-control focus and card accessible roles. Independent re-review reports no Critical/Important blockers.
- Existing release tests now check structured showdown/best-five/board/pot results and removed completed-hand betting controls instead of the replaced toast.
- Impeccable detector returned `[]`. Native screen-reader, physical-phone keyboard and hosted acceptance remain playtest checks.
