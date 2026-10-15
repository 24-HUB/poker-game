# Bot players implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a host play solo or with friends against casual bots, with fair information, safe reconnects and no persistent ticket rewards in practice sessions.

**Architecture:** Keep the existing room queue, authoritative poker engine and settlement transactions. Persist a separate bot roster and immutable session mode; run a pure strategy over a restricted observation and apply its actions through the existing game transition path. Presence pauses gameplay timers while allowing completed-hand settlement to finish.

**Tech Stack:** Existing TypeScript, NestJS/Socket.IO, MongoDB official driver, Next.js/React, Zod, Jest, Vitest and Playwright. No new runtime dependency.

**Spec:** [Bot-player design](../specs/2026-10-15-bot-player-design.md), approved for implementation by the user's request to implement PR #31 on 2026-10-15.

**Status:** Plan prepared and self-reviewed; awaiting user review before application implementation. Continue inline on `codex/bot-player-plan`, updating draft PR #31 targeting `dev`. Do not merge or deploy.

## Global constraints

- Six seats total; at least one human and two total players; one casual difficulty.
- Bots have server-generated `bot:<UUID>` identifiers, default equipment and no accounts, sessions, wallets or active-account locks.
- Add/remove only before sessions; bots never become host. Preserve bots after normal session completion.
- Any bot freezes the entire session as practice: no wallet creation/revision changes, daily earnings, receipts or ticket ledger writes.
- Keep 1,000 starting chips, 10/20 blinds, 30-second safety deadlines and five-second committed-hand result display.
- Bot thinking takes 1,000–3,000 ms. Pause/resume preserves the sampled action and remaining time.
- With zero connected humans, freeze gameplay; allow two minutes to reconnect. Completed-hand settlement must finish safely even if cleanup must wait.
- At committed hand boundaries, end-reason priority is host request, no funded humans, fewer than two funded players.
- Legacy missing bot arrays, kinds and modes normalize to empty, human and standard respectively.
- Preserve command identity/retry behavior, recipient privacy, maintenance controls and the single-active-session limit.
- Use pinned pnpm 10.33.0 and the frozen lockfile. Prepare migration 007; apply only to isolated test data.

## Review focus

1. A forged standard settlement for a durable practice session must fail before any wallet side effect (Task 3).
2. A revoked final human socket or remaining observer tab must produce the correct presence decision (Task 5).
3. A queued callback from before a pause must never act after resume even if actor/version match (Task 5).
4. A completed hand settling after retention expires must commit once before cleanup, without another deal (Task 5).
5. Legacy hand history and a later humans-only session must retain correct labels, parsing and rewards (Tasks 1, 3 and 6).

## Task 1: Contracts and legacy compatibility

**Files:** Modify `packages/contracts/src/{rooms,poker,index}.ts` and their existing tests; `apps/server/src/modules/rooms/{roomController,session.repository,session.service}.ts`; `apps/server/src/projections/{roomProjection,gameProjection}.ts`. Create `apps/server/src/modules/rooms/botCompatibility.ts` and `botCompatibility.spec.ts`.

**Interfaces:** Export `RoomBot = { botId: string; displayName: string; seat: number }`, `ParticipantKind = 'human' | 'bot'`, `SessionMode = 'standard' | 'practice'`. Add `RoomView.bots`, participant `kind`, and result/game `mode`; add `GameView.presencePaused` and `NO_FUNDED_HUMANS`. Extend strict room commands and typed client events with `room:addBot` (`seat`, `controlEpoch`) and `room:removeBot` (`botId`, `controlEpoch`), retaining existing mutation metadata. `normalizeSession(document)` and `normalizeHandResult(result)` normalize legacy records before strict public parsing; new runtime/output types use explicit mode/kind.

- [ ] Add failing contracts tests: accept add/remove with valid metadata; reject seat -1/6, malformed bot IDs and extra fields; parse practice results and the new end reason. Add compatibility tests asserting missing fields become `bots: []`, `kind: 'human'`, `mode: 'standard'`, while explicit practice/bot values survive history parsing.
- [ ] Run `pnpm --filter @poker/contracts test`; run server `botCompatibility.spec` and confirm the new cases fail for missing behavior.
- [ ] Implement the interfaces, normalization at persistence reads and explicit projection fields. Keep bot IDs as opaque engine `accountId` values; account authorization still uses verified human identity. Update typed fixtures to compile without weakening schemas.
- [ ] Rebuild contracts/engine, run the contracts and compatibility tests and server/web typechecks; inspect all results.
- [ ] Commit task-owned files: `feat: define bot and practice session contracts`.

## Task 2: Host-owned roster and frozen session starts

**Files:** Modify `apps/server/src/modules/rooms/{room.repository,room.service,session.repository,session.service}.ts`, `apps/server/src/realtime/{game.gateway,commandRateLimiter}.ts`; extend `apps/server/test/{rooms,sessions,gateway}.e2e-spec.ts`.

**Interfaces:** `RoomRepository.addBot(input)` and `removeBot(input)` return `StoredCommandOutcome` and reuse command recording/fencing. Inputs retain current command context; add input includes a bot ID sampled once outside transaction retry, and requested seat. Choose the lowest unused `Bot 1`–`Bot 5` name inside the serialized transaction. Store optional `rooms.bots`; `SessionRepository.start` derives mode from the combined, seat-sorted roster. Only human participants enter active-account locks and equipment reads.

- [ ] Add failing real-replica-set tests asserting only the controlling host can mutate bots, exact retries preserve one bot/ID, conflicting payloads fail, six total occupants means full, and playing-phase mutations fail.
- [ ] Add races for add versus human join/seat movement/session start; assert unique union seats and one consistent frozen roster. Test one human plus 1–5 bots starts and bots cannot become host after disconnect/leave.
- [ ] Run `pnpm --filter @poker/server test --runInBand 'rooms.e2e-spec|sessions.e2e-spec|gateway.e2e-spec'` and inspect the expected failures.
- [ ] Implement roster transactions and service dispatch. Include bot seats in join/move/start capacity checks and room revision conditions. Register gateway events through existing validation, acknowledgement, rate-limit and publication paths.
- [ ] Freeze participant kinds and mode at start. Use no reward policy for practice, no bot lock/equipment lookup, and preserve the existing admission/maintenance gates. Keep bot roster after normal end and remove it on room closure.
- [ ] Rerun the suites, including real Socket.IO add/remove/takeover acknowledgements; commit `feat: add host controlled bot seats and practice starts`.

## Task 3: Durable practice settlement and migration

**Files:** Modify `apps/server/src/modules/settlement/{settlement.service,settlement.repository}.ts`, `apps/server/src/modules/tickets/tickets.repository.ts`, `apps/server/src/database/migrate.ts`; create `apps/server/src/database/migrations/007-bot-players.ts`; extend `apps/server/test/{settlement,wallet,database}.e2e-spec.ts` and session tests.

**Interfaces:** Add explicit mode to `SettlementCandidate`, its hash and committed result. `SettlementRepository` validates normalized durable session mode and the full ordered participant roster against the candidate before wallet preparation, then revalidates inside the fenced settlement transaction. `TicketsRepository.awardHand` defensively rejects standard-with-bots/conflicting durable mode and returns no receipts for practice, even if a reward policy is supplied.

- [ ] Add failing tests taking before/after snapshots of wallets, revisions, daily earnings, ledger and receipts. Practice commit, retry and lost acknowledgement must leave all unchanged while committing result/stacks once. Test absent wallets remain absent, including bot wallets.
- [ ] Test a forged standard candidate against durable practice, forged bot/human kinds, mismatched roster and a standard roster containing bots; reject before any wallet creation. A subsequent valid humans-only standard session must still award normal rewards. Preserve existing legacy settlement fixtures by adding durable roster/mode where their records require it.
- [ ] Run `pnpm --filter @poker/server test --runInBand 'settlement.e2e-spec|wallet.e2e-spec|sessions.e2e-spec'` and confirm the security cases fail before implementation.
- [ ] Implement durable preflight before the existing out-of-transaction wallet preparation, plus transactional revalidation. Persist mode in hand/session results and history; preserve atomic result/stacks and exact retry identity. New-session mode never changes after start.
- [ ] Add migration 007 without modifying historical migrations. Validate bounded rosters, unique bot IDs/seats, participant kinds and session modes while accepting legacy omissions. Register it and test reruns, valid legacy/new documents and invalid explicit values on disposable data.
- [ ] Run affected suites including `database.e2e-spec`; commit `feat: prevent practice sessions from awarding tickets`.

## Task 4: Restricted observations and casual strategy

**Files:** Create `apps/server/src/modules/rooms/bots/{botObservation,botStrategy,botRandom}.ts` and corresponding `.spec.ts` files; modify `packages/poker-engine/src/hand.ts` and `hand.test.ts`.

**Interfaces:** `buildBotObservation(hand: HandState, botId: string): BotObservation` copies own cards and public fields only. `chooseBotAction(observation: BotObservation, sample: number): PokerAction` is pure; no engine state, deck or hidden cards enter it. `BOT_RANDOM` injects `next(): number` separately from deck randomness. Extend `applyAction` action source with `'bot'`; only `'manual'` records manual qualification.

- [ ] Write failing deterministic strategy tests at all probability boundaries: strong raise `< 0.65`; weak facing-bet call `< 0.10` up to one big blind; free weak bluff `< 0.05`. Medium calls satisfy both pot/3 and stack*0.15 limits. Test pair/ace/broadway/suited-connector tiers, ace-low/high open-ended draws, gutshot exclusion, flush draws and made-hand precedence.
- [ ] Test half-pot raise targets clamped to legal min/max, exact short all-in targets and check/fold fallback. Test observation keys recursively exclude deck/deck index/opponent cards; changing hidden cards/deck with fixed permitted fields/sample yields identical decisions. Bot actions must not qualify for manual rewards.
- [ ] Run `pnpm --filter @poker/server test --runInBand 'botObservation.spec|botStrategy.spec'` and `pnpm --filter @poker/poker-engine test`, confirming new cases fail first.
- [ ] Implement copied readonly observations and the exact spec section 6 thresholds using existing card/evaluator helpers. Keep computation bounded and dependency-free; validate sample inputs and expose injected randomness for scheduling.
- [ ] Rerun relevant tests and typechecks; commit `feat: choose legal casual bot actions from public information`.

## Task 5: Fenced scheduling, presence pause and session endings

**Files:** Modify `apps/server/src/modules/rooms/{game.service,room.service,roomRegistry,rooms.module,session.service}.ts`, `apps/server/src/projections/gameProjection.ts`; create `bots/botTurnScheduler.ts`, `sessionEndReason.ts` and focused tests; extend `apps/server/test/{poker,poker-recovery,poker-gateway}.e2e-spec.ts`.

**Interfaces:** `sessionEndReason(runtime): SessionResult['reason'] | null` is shared by authority/projection. `BotTurnScheduler` stores one `{ action, remainingMs, generation, bootId, epoch, sessionId, handId, gameVersion, actor, dueAt }` record per room. Game authority owns `setHumanPresenceInQueue(roomId, present)` and `cancelRoomInQueue(roomId)` lifecycle hooks. Register hooks through the rooms module without a RoomService/GameService constructor cycle; room code awaits them within its existing queue and hooks never enqueue recursively.

- [ ] Add controlled-clock failing tests asserting 1,000 and 3,000 ms bounds, no early action, at most one bot/safety action, no manual reward qualification and check/fold fallback after thrown/illegal strategy output. Exercise full real hands with 1–5 bots through the existing settlement/publisher path.
- [ ] Add tests capturing callbacks before cancellation: invoke them after actor/hand change, pause/resume with unchanged game version, lease epoch/boot change, room removal and shutdown; all must be no-ops without recreating a registry entry.
- [ ] Add presence tests: zero humans pauses bot and human deadlines and result countdown; one authenticated observer prevents pause; revoked final socket does not. Reconnect at 119 seconds preserves action/sample/remaining delay; at retention expiry close/abort with no extra deal. Standard sessions retain existing timeout behavior.
- [ ] Add settlement-outage tests: a completed pending hand still retries while presence-paused; a successful commit retains a full 5,000 ms result interval for reconnect. At expired retention, wait for commit then close promptly; never discard the result or award practice tickets.
- [ ] Add end-priority tests for host request, all humans bust with multiple funded bots, and one funded player. Assert `nextTransition` agrees with the actual session-end reason and five-second display is retained.
- [ ] Run targeted server tests to confirm failures, then implement scheduling and lifecycle hooks. Build/sample bot intent once; never wait inside the room queue. Revalidate current legal action and all fence fields on callback. Preserve settlement pause independently of presence pause; suppress human mutation while presence-paused.
- [ ] Reconcile presence after validated join/sync/disconnect/leave and socket revocation; clean timers before registry removal. Preserve the original two-minute wall-clock retention deadline across settlement deferral rather than restarting a new two-minute window.
- [ ] Run targeted suites plus existing recovery/authority suites; commit `feat: run bot turns with safe practice pause and cleanup`.

## Task 6: Waiting room, table and results experience

**Files:** Modify `apps/web/src/features/rooms/{RoomLobby,RoomExperience,PokerTable,HandResultPanel,HandCompletionBar,HandHistory}.tsx`, corresponding tests, and existing connection/pending-command integration as needed. Create `apps/web/tests/e2e/bots.spec.ts`.

**Interfaces:** Add `onAddBot(seat)` and `onRemoveBot(botId)` callbacks to `RoomLobby`; `RoomExperience` constructs normal room mutations and uses existing `send`. Start eligibility counts humans plus bots. Render kind/mode from authoritative snapshots/results, including history. No new client authority or timers that apply actions.

- [ ] Read `apps/web/AGENTS.md`, relevant installed Next.js guidance and the nextjs-senior-frontend/impeccable skills before UI code changes. Reuse existing table/seat styling and accessible control patterns.
- [ ] Add failing component tests for controlling-host-only add/remove, unavailable/pending states, Bot labels without Reconnecting copy, solo start eligibility, exact `Practice · No tickets` and `Remove all bots before starting to earn tickets.` notices, and practice history/results explaining no tickets instead of missing-receipt/cap errors.
- [ ] Add connection regression tests: lost add/remove acknowledgement retains the same command ID on reconciliation; observer cannot mutate; roster follows server snapshot after takeover/reconnect.
- [ ] Run `pnpm --filter @poker/web test` and confirm new tests fail. Implement the callbacks, controls, notices and labels; preserve normal showdown secrecy and default cosmetics. Show Thinking… only for the authoritative acting bot.
- [ ] Add Playwright solo/mixed scenarios using isolated persisted human accounts: add/remove, start, play/finish, end/restart with retained bots, observer takeover and reconnect. Test later bot-free standard rewards. Inspect 360px and 1440px screenshots and keyboard navigation with no overflow.
- [ ] Run web tests and `pnpm --filter @poker/web test:e2e -- bots.spec.ts`; commit `feat: expose practice bots in room and poker views`.

## Task 7: Full verification and PR handoff

**Files:** Update this plan's checkboxes, `CHECKPOINT.md`, `plan.md` section 18 and spec status with actual evidence. Keep logs/screenshots in ignored `.artifacts/bot-players-2026-10-15/`.

- [ ] Recheck status/branch, fetch and usage. Continue task branch; report upstream advancement without automatically integrating it. Run `pnpm install --frozen-lockfile`; use only disposable replica-set databases from the existing test harness. Inspect actual CI and test-stack configuration before running checks.
- [ ] Run `pnpm check` and fresh `CI=true` full Chromium acceptance via `pnpm --filter @poker/web test:e2e`. Inspect outputs, fix failures and rerun affected checks. No lint script exists. Record unavailable checks honestly; no success claims from historical evidence.
- [ ] Review complete diff against `origin/dev`, especially account/economy filters, legacy normalization, scheduling fences and stale callbacks. Use the requesting-code-review and verification-before-completion workflows; independent agents require user authorization under the current session constraints.
- [ ] Fetch before final handoff; run `git diff --check`, `git diff origin/dev --check` and `git status --short --branch`. Record exact results, commit, remaining issues, usage observation/reset times and next step in both checkpoints.
- [ ] Commit only task-owned changes; `git push -u origin codex/bot-player-plan`. Update PR #31 with final feature scope, validation and `dev` base. Keep draft if incomplete or checks are blocked. Inspect latest CI/Worker packaging before describing readiness.
- [ ] Link PR and summarize branch, implemented behavior, checks and limitations. The user merges manually; leave branch/PR intact. No deployment or hosted migration is included.
