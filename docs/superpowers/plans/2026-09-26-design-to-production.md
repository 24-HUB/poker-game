# Approved Design to Production — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Use superpowers:subagent-driven-development only if the user selects delegation. Steps use checkbox syntax for tracking. This document is a plan; unchecked tasks have not been implemented.

**Goal:** Deliver the approved anime interface as an authenticated private-room experience, then extend it through playable poker, earned tickets, and cosmetic collection.

**Architecture:** Retain the pnpm workspace, Next.js frontend, authoritative NestJS backend, shared contracts, and MongoDB described in the existing system plan. The static prototype supplies visual reference and interaction lessons; production data and commands come from the backend. Work proceeds as usable vertical slices.

**Tech stack:** The selected Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, minimal Zustand live state, NestJS/Express, Socket.IO, Better Auth, Zod, and native MongoDB driver. Use the selected Cloudflare/Render/Atlas hosting path. Verify and pin compatible versions during foundation execution; this plan does not claim current provider compatibility or provisioning success.

**Specs:** [System plan](../../../plan.md), especially sections 14, 16, 17 and 19; [visual and interaction design](../../../design.md); [approved concept](../../design/approved-theme-v4.png); [prototype review](../../design/lobby-prototype-review.md).

**Status:** Ready for implementation review. The user has accepted the visual direction and requested this plan. Production implementation has not started. The prototype is complete within its local-demo scope.

## 1. Scope and authority

This plan adds the design-to-production details to section 19 of plan.md. It does not repeat or replace that section's database, authentication, authority, gateway, or deployment tasks.

Tasks B–E below expand the frontend and acceptance work of existing section 19 task 9. Implement that work once, using these design details and its existing contracts; do not execute two competing versions of task 9.

The detailed executable scope is **M0/M1: foundation, sign-in, approved lobby, secure invitations, and live private rooms**. Later milestones have a dependency roadmap below; their detailed engine/economy plans are written when their proposed rules have been resolved.

| Authority | Owns |
|---|---|
| plan.md | Product rules, security, backend contracts, hosting, milestones |
| design.md | Approved style, screen behavior, layout, accessibility |
| This plan | Implementation sequence, file ownership, integration checks |
| prototype/ | Visual reference and disposable interaction examples only |

Where prototype behavior conflicts with the system plan, the system plan wins. The prototype never authorizes an API contract or economic rule.

## 2. Global constraints

- Preserve the current dev checkout and all uncommitted design/prototype/checkpoint files. Preserve codex/system-design as the existing plan-only branch.
- Before production code, inspect attached worktrees. Reuse a suitable free checkout or create a managed worktree from the reviewed planning ref. Use the planned `codex/m0-m1-foundation` implementation branch, checking whether it already exists before creation. Do not reset or clear a checkout.
- Copy the reviewed design, this plan, approved reference, and prototype reference into the implementation checkout explicitly; managed worktree creation does not copy uncommitted files. Verify copied contents before relying on them.
- Retain package names `@poker/contracts`, `@poker/server`, and `@poker/web` and the `{ data, error }` result envelope from plan.md.
- Server identity, room permissions, legal actions, wallet changes, and equipment remain authoritative. No optimistic chips, seats, ownership, or ticket balances.
- Use original/licensed art. Treat the generated hostess as provisional artwork. Keep Looking Glass Club as a provisional name until naming is confirmed.
- Preserve the blue/white shell, small supporting character, sparse gold/celestial accents, and Wonderland motifs. Do not restore the superseded dark moonlit style.
- Support 360 px portrait phones, intermediate widths, and desktop. Primary targets are at least 44 × 44 px. Validate text contrast and keyboard focus on rendered components.
- Initial account reads are private and uncached. Create sockets in client effects with cleanup, never in Server Component rendering.
- Before M3, do not display the prototype's 25 demo tickets as a real balance. Before M4, omit unfinished Collection/Invitations destinations from production navigation; keep the reusable shell ready for them.
- Production room titles have a maximum of **24 characters**. Production room admission uses secure invitation tokens. Neither `TEA123` nor query-string demo room links carry over.
- No purchases, premium currencies, paid infrastructure, daily claims, public matchmaking, or unplanned features.
- Check account usage before substantial work and at task boundaries. If either remaining window falls below 6%, save the task, files/commit, commands, test outcomes, blockers, and next action in the implementation checkpoint before further substantial work. Never redeem reset credits automatically.

## 3. Decisions and readiness

The design is sufficient to start the first production slice. Remaining visual details are reviewed on actual screens as each slice is built, rather than generating another full concept board.

| Item | Current position | Resolve by |
|---|---|---|
| Google-only sign-in | Existing M1 proposal, not newly confirmed by visual approval | Before authentication implementation |
| Participant-only room access; one controlling tab/account | Existing M1 proposals | Before room/gateway behavior is locked |
| Final product/character names | Looking Glass Club and Alice are placeholders | Before public release; not a foundation blocker |
| Starting stacks, blinds, timeout, seat locking, bust-out behavior | Proposals in plan.md | Before detailed M2 execution plan |
| Reward amounts, cap, prices, pity, duplicates, catalogue | Proposals in plan.md | Before M3/M4 implementation |
| Final avatar/card-back assets | One provisional character exists | Before M4 acceptance |
| OAuth/provider access and free-tier settings | Not verified by the prototype | During M0 deployed acceptance |

Do not ask again about the approved visual blend, desktop priority, portrait seating, or envelope reveal. Review only unresolved product choices when the relevant milestone begins.

## 4. Sequence and dependencies

| Work | Depends on | Result |
|---|---|---|
| A. Foundation execution | Reviewed system plan, isolated checkout | Existing section 19 tasks 1–5 establish contracts, persistence, authority, proxy, auth |
| B. Design shell | Foundation task 1 | Approved interface expressed as maintainable React components |
| C. Sign-in and session handling | B and foundation auth/proxy | Real sign-in, private data, server-starting and signed-out states |
| D. Invitation and room interactions | C and existing section 19 tasks 7–8 | Real create/join/seat/host/control behavior |
| E. Integrated M0/M1 acceptance | A–D and deployed foundation task 6 | Tested local and deployed private-room experience |

Execute A first, introduce B after its workspace exists, then integrate C and D as their backend dependencies become available. Local UI work can continue while provider access is unavailable; M0 deployment stays blocked until its real checks pass.

## 5. Review focus

1. A copied invitation survives the sign-in redirect without leaking its token into page requests, logs, or shared snapshots.
2. A sleeping backend or a timed-out request produces a recoverable state rather than false logout, fake zero data, or a duplicate create/join.
3. An older snapshot, older connection, or previous account cannot overwrite the current room or retain mutation control.
4. Long names, full six-seat rooms, dialogs, keyboard focus, and artwork fit a 360 px portrait layout.
5. Prototype-only data and interactions do not accidentally become production features, credentials, or navigation destinations.

## 6. Detailed first-slice tasks

### Task A — Execute the existing foundation plan

**Files and interfaces:** Use the exact files, exported signatures, and tests in plan.md section 19 tasks 1–5, 7 and 8. Do not create a second database, auth, invitation, or gateway implementation under a new name.

**Consumes:** Reviewed specs and implementation checkout.
**Produces:** The `Result<T>`, `RoomCommand`, `RoomReply`, `RoomView`, authenticated HTTP/session path, `connection:ready`, `room:snapshot`, `room:closed`, and authorized room command handling already defined in section 19.

- [ ] Confirm unresolved M1 defaults and record the decision in the implementation checkpoint.
- [ ] Verify toolchain/provider compatibility against current official documentation; pin actual versions in task 1 and the lockfile.
- [ ] Run each existing task's meaningful failing behavior test before implementing its behavior. Use build checks for configuration-only work.
- [ ] Complete tasks 1–5, then 7–8 with their prescribed suites and focused commits. Frontend tasks B–D join this sequence at the dependencies in section 4.
- [ ] Preserve task 6's real deployed checks for Task E; local seeded sessions do not count as successful OAuth deployment.

**Pass evidence:** The original foundation/room tests, typechecks, production builds and recorded commands pass. No test runner or app scaffold currently exists in this checkout; commands below become runnable after this task creates them.

### Task B — Port the approved shell and lobby composition

**Create:**

- `apps/web/src/components/ui/{Button,Dialog,FormField,InlineStatus,Icon}.tsx`
- `apps/web/src/components/shell/{GameShell,GameNavigation,CompanionPortrait}.tsx`
- `apps/web/src/features/rooms/{Lobby,Lobby.test}.tsx`
- `apps/web/src/styles/tokens.css`
- `apps/web/public/art/hostess.png` and `apps/web/public/art/README.md`
- `apps/web/e2e/design-shell.spec.ts`

**Modify:** Existing `apps/web/src/app/layout.tsx`, `globals.css`, and the `(game)/lobby/page.tsx` page from system-plan task 9. Keep shared providers in their planned locations.

**Interfaces:**

- `GameShell({ children }: { children: ReactNode })` owns responsive navigation and content layout.
- `CompanionPortrait({ name, src }: { name: string; src: string | null })` renders supporting art or a labeled fallback.
- `Lobby({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void })` owns the approved composition and primary triggers, not network behavior.
- Button accepts native button props plus `variant: 'primary' | 'secondary'` and optional `pending: boolean`; the underlying element stays a real button.
- Dialog uses native dialog behavior or an accessible focused implementation; no separate bespoke modal framework.

- [ ] Write `lobbyInvokesCreateAndJoin`: click each primary button and assert its supplied callback runs once. Write `dialogRestoresFocus` in browser coverage: Escape closes the dialog and focus returns to its trigger.
- [ ] Run `pnpm --filter @poker/web test --run Lobby.test.tsx`; confirm failure from missing behavior, then implement the components.
- [ ] Port tokens and layout deliberately from design.md. Rebuild the DOM as React components; do not embed the prototype page or bulk-copy its event listeners. Remove its demo balance and placeholder production destinations.
- [ ] Copy the character asset with provenance, intrinsic dimensions and suitable loading behavior. Preserve the tested small desktop arch and compact phone header. Handle image failure with a useful labeled fallback.
- [ ] Run web tests/typecheck and `pnpm --filter @poker/web exec playwright test e2e/design-shell.spec.ts`. Check 360 × 800, 900 × 900 and 1440 × 1000 for zero horizontal overflow, primary controls, focus visibility and target size.
- [ ] Commit only this slice: `feat: add approved anime lobby shell`.

### Task C — Connect authentication and session states

**Create:** `apps/web/src/app/sign-in/page.tsx`; `apps/web/src/features/auth/{SignInPanel,SessionBoundary}.tsx`; `apps/web/e2e/session.spec.ts`.

**Reuse/modify:** `providers/QueryProvider.tsx`, `lib/api.ts`, `lib/server-api.ts`, and `lib/socket.ts` from system-plan task 9. Reuse `apiGet<T>` and `readServerSession(cookieHeader)` exactly; do not add parallel session readers or change their response envelope.

**Interfaces:** `SessionBoundary({ children }: { children: ReactNode })` renders authenticated content only for a confirmed session. Distinguish unauthenticated, starting/unavailable and authenticated responses; do not collapse them into one boolean.

- [ ] Add `backendUnavailableDoesNotSignOut`: HTTP 503 shows server-starting/retry UI without presenting it as a revoked session. Add `signOutClearsPrivateState`: switching accounts clears query/live state and disconnects the old socket.
- [ ] Run the focused suite and browser test, verify the expected failures, then implement the session boundary and sign-in composition.
- [ ] Keep initial private reads bounded and uncached. Map authentication errors separately from transport/readiness errors. Account switching must remove the preceding user's data before rendering another account.
- [ ] Run `pnpm --filter @poker/web exec playwright test e2e/session.spec.ts`, web tests/typecheck, and the existing auth integration suite. Verify actual OAuth separately in Task E.
- [ ] Commit: `feat: connect lobby authentication and recovery states`.

### Task D — Replace demo room flows with authorized realtime flows

**Create/modify:** The planned `features/rooms/{RoomLobby,InviteLanding}.tsx`, `roomStore.ts`, `roomStore.test.ts`, `useRoomConnection.ts`, lobby and room routes; add `features/rooms/{RoomForms,RoomSeat,RoomConnectionStatus}.tsx`, `features/rooms/invitation.ts`, `features/rooms/invitation.test.ts`; extend `e2e/lobby.spec.ts`.

**Consumes:** `RoomView`, `RoomCommand`, `RoomReply`, `Result<T>`, and `useRoomConnection(roomId: string | null)` from the existing system plan. Keep `send` command identities stable while the outcome is unknown. `applySnapshot(view)` ignores older revisions; `clear()` removes private room state.

**New interface:** `readInvitationFragment(hash: string): string | null` parses the `invite` field of a fragment such as `#invite=...`. It never accepts a room ID as an authorization credential. The contract's server validator remains authoritative for token validity.

- [ ] Write invitation parsing tests for missing/empty fields, unrelated fragments, and valid encoded values. Add `roomTitleLengthBoundary`: a 24-character title is accepted and 25 characters rejected consistently in client/server schemas.
- [ ] Add `inviteSurvivesSignInWithoutUrlLeak`: capture a fragment token, immediately remove the fragment, retain it only in tab-scoped session storage across the sign-in redirect, then submit it through the authenticated socket and clear it on success or definitive invalidation. Storage survives refresh but tokens never go to localStorage, analytics or logs. Verify page requests and redirect URLs do not contain the token. If storage is unavailable, explain that the invitation must be reopened after sign-in.
- [ ] Write/extend `lostCreateAckKeepsCommandId`, `ignoresOlderSnapshot`, `twoAccountsJoinSameRoom`, `oldTabCannotMutateAfterTakeover`, and `serverWakePreservesInvite`. Watch their intended failure before implementing the behavior.
- [ ] Implement room creation with the production title limit, secure link joining, validated replies and snapshots, inline command errors, explicit pending state and recovery. Query-string demo links and `TEA123` must not work in production.
- [ ] Render six seat slots from the confirmed snapshot. Support host status, connected/disconnected members, moving to a vacant seat, invitation rotation for the host and explicit control takeover. Do not invent a ready-check feature.
- [ ] Keep Start session unavailable in M1 with a clear explanation, or omit it until M2; do not send an unimplemented session command. Never display fabricated online friends.
- [ ] Validate clipboard success and failure feedback, full/expired/rotated invitations, revoked sessions, rejected host operations, and reconnect after missed updates. Continue using per-recipient views; no invitation token belongs in a room broadcast.
- [ ] Pass focused web/contract tests, existing room/gateway integration tests, and `pnpm --filter @poker/web exec playwright test e2e/lobby.spec.ts` with distinct authenticated test accounts.
- [ ] Commit: `feat: connect private room lobby and secure invitations`.

### Task E — Verify the integrated first milestone

**Files:** Update implementation checkpoint/evidence and existing CI/smoke configuration from section 19 task 6. Add `apps/web/e2e/accessibility.spec.ts` for keyboard, accessible labels and responsive flow checks.

**Consumes:** Completed A–D plus authorized access to the selected providers. **Produces:** Explicit local/deployed pass or blocker records for M0 and M1.

- [ ] Run `pnpm check` as defined by the foundation; confirm contract/server/web checks and both builds pass. Run browser suites separately against the real local services and test replica set.
- [ ] Inspect desktop/phone sign-in, lobby, populated/full waiting room, errors and reconnect states. Verify 44 px targets, 4.5:1 normal-text contrast, visible focus, long names, reduced motion and no overflow at 360 px. Use a visual review, not only snapshot assertions.
- [ ] Execute the original task 6 deployment checks: actual OAuth callback/cookies, Worker proxy and Socket.IO transport, sleep/wake, backend ownership replacement and provider limits. Record environment limitations honestly.
- [ ] Run two real signed-in accounts through create → copy secure invitation → join → seat move → reconnect → leave. Verify authorization directly at the API/socket boundary as well as through the UI.
- [ ] Have the completed implementation reviewed against both specs. Fix material findings and rerun affected checks before recording M1 as verified.
- [ ] Commit: `test: verify approved lobby and private-room milestone`.

## 7. Later milestones and design reviews

These are implementation dependencies and acceptance goals, not yet detailed task plans. Resolve the listed gameplay/economy proposals and write the next milestone's executable plan before beginning its new subsystem.

| Milestone | Build | Required design review | Completion evidence |
|---|---|---|---|
| M2: poker | Pure engine, serialized session/actions, recipient-specific snapshots, timers, table and results | Six-seat desktop and 360 px portrait table; visible pot/cards/timer/legal actions; side pots; disconnect and all-in states | Engine invariants, chip conservation, card privacy, timeout races, reconnect; friends complete consecutive hands |
| M3: tickets | Atomic settlement rewards, wallet/allowance reads, reward summary, real ticket indicator | Pending versus confirmed rewards; cap reached and zero-reward explanations | Duplicate settlement and transaction tests; correct account balance across refresh/login |
| M4: cosmetics | Permanent catalogue, transactional pulls/pity, collection, avatar/card-back equipment | Collection grid and detail; invitation animation, skip/reduced motion; ten-pull grid; duplicates and insufficient tickets | Earn → pull → equip persists; request retries charge once; next-hand equipment visible to another player |
| M5: release | End-to-end robustness, final assets/naming, performance, accessibility, deployment/backup drills | Final desktop/phone review across complete flow | Full friends playtest, restart/sleep drills, actual restore, no unresolved release blockers |

M2 must establish the settlement boundary required by M3. M3 must exist before a production ticket balance or spending UI. M4 must receive committed server results before revealing them; animation does not create rewards.

### Screen implementation map

| Screen | Location planned | Milestone |
|---|---|---|
| Sign-in | `apps/web/src/app/sign-in/page.tsx` | M0/M1 |
| Lobby | `apps/web/src/app/(game)/lobby/page.tsx` | M1 |
| Waiting room and live table | `apps/web/src/app/(game)/rooms/[roomId]/page.tsx` | M1 waiting; M2 live state |
| Poker components | `apps/web/src/features/poker/` | M2 |
| Wallet and reward components | `apps/web/src/features/wallet/` | M3 |
| Invitations/reveal | `apps/web/src/app/(game)/invitations/page.tsx`, `features/invitations/` | M4 |
| Collection/equipment | `apps/web/src/app/(game)/collection/page.tsx`, `features/collection/` | M4 |

Do not prebuild empty production routes for all future milestones. Introduce them when their working vertical slice exists.

## 8. Handoff

Recommended execution: **inline**, starting with M0/M1. Its shared contracts and auth/socket dependencies favor one continuous implementation context and conserve usage. This is a recommendation, not permission to begin implementation during this planning request.

Next execution session: check usage; review this plan and the existing section 19; resolve only the three M1 product defaults listed in section 3; prepare the isolated checkout; preserve/copy the approved design references; begin the original foundation task 1. Save progress at task boundaries and below the user's 6% usage threshold.

Plan self-review: first-slice dependencies point to existing interfaces; the title-limit and demo-token conflicts are explicitly resolved; every review-focus failure has assigned verification; later engine/economy work is labeled as a roadmap; no deployment, passing tests, or product-rule approval is claimed by writing this document.
