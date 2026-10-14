# Automatic server recovery — implementation specification

Date: 2026-10-14 (Asia/Bangkok)
Status: User-requested implementation is locally verified on PR #30. Deployment remains separate; see CHECKPOINT.md for verification and publication evidence.
Baseline: freshly fetched `origin/dev` commit `af8aaa02`.

## 1. Outcome and scope

A player opens Looking Glass Club, sees the shell immediately, and can sign in
without repeatedly pressing Retry while the backend wakes up. If their session
is still valid, the app restores that account instead. Recovery must stop after
a bounded interval and explain persistent failures honestly.

The user accepted automatic session checks for up to 90 seconds and requested
this specification. This is a bounded improvement to the existing authentication
flow, supplementing [plan.md sections 13–16](../../../plan.md). The lifecycle,
request limits and error classifications below are implementation decisions in
this proposed specification, not evidence that the feature already works.

Retain Render Free, Cloudflare Workers, the 15-second Worker upstream timeout,
existing server authentication and existing poker reconnect/command behavior.
No dependencies, database changes, hosting upgrades, deployment, scheduled jobs,
artificial keep-alive traffic or general application-wide retry policy are needed.

## 2. Evidence and cause

On 2026-10-14, requests to the documented live public origin initially returned
`504 Backend timeout` from `/api/me` after approximately 15.7 seconds. Both
`/api/me` and `/api/health/ready` subsequently timed out at approximately 16
seconds. At 21:42:49–50 Bangkok, readiness returned 200 and `/api/me` returned
the expected signed-out 401 in under one second. The shell returned 200 while
the API was unavailable. No live credentials or account mutations were used.

This strongly supports a sleeping/waking backend, but backend logs were not
inspected; the precise Render instance event is not proven. Render's public
status API reported All Systems Operational during the investigation.

Pre-implementation behavior observed during diagnosis:

- `worker/proxy.ts` aborts ordinary upstream requests after 15,000 ms.
- `lib/auth-client.ts` maps session transport, non-401 HTTP and invalid-body
  failures to `unavailable`, without distinguishing their causes.
- `SessionBoundary.tsx` uses one shared session query, without timed recovery.
- `QueryProvider.tsx` disables query retries. Returning `unavailable` also
  resolves the query rather than rejecting it, so enabling generic retries alone
  would not implement this feature.
- `AccountAccess.tsx` labels every unavailable result “Server starting” and hides
  Sign in until an authoritative unauthenticated response arrives.
- Existing browser acceptance exercises a two-second interruption followed by
  a manual Retry; it does not establish automatic recovery from a real cold start.

Relevant existing session/UI/proxy tests passed 29/29 during diagnosis. These
are baseline checks, not verification of the proposed feature.

Render documents sleeping after 15 idle minutes and waking on a new request,
typically taking about a minute: [Free-tier documentation](https://render.com/docs/free).
Its [Acceptable Use Policy](https://render.com/acceptable-use) prohibits abusive
loads and bypassing usage restrictions. Bounded recovery during an active visit
is the design intent; neither this spec nor the investigation constitutes an
explicit approval from Render.

## 3. Recovery rules

Use `/api/me` as the only automatic probe. Its authoritative result establishes
whether to show Sign in or a verified account; do not add a parallel readiness
poller. Keep `credentials: 'include'` and `cache: 'no-store'`.

| Rule | Required behavior |
|---|---|
| Owner | One recovery coordinator in the shared `SessionProvider`; all account and access-boundary surfaces consume it. |
| Start | Begin a recovery window when an explicit initial session read or user-requested refresh starts. |
| Deadline | 90,000 ms of wall-clock time from that first request, including request duration and hidden/offline time. |
| Spacing | After an unavailable result, wait 5,000 ms after completion before starting another request. No overlapping requests. |
| Request bound | Abort each browser session request after at most 20,000 ms, or the remaining recovery-window time, whichever is shorter. Cover body parsing as well as receiving headers. |
| Request cap | At most 18 session requests per window, including the initial request and expedited manual retries. |
| Success | A valid 200 identity or 401 ends recovery immediately and clears its timer. No recurring healthy-state polling. |
| Exhaustion | At the deadline, abort outstanding work and show terminal unavailable state. After a failed final allowed request, show the same state; do not abort that final request merely because it used the last slot. Wait for explicit Retry. |

The five-second delay is measured after a response, not by `setInterval`:
a 15-second failed request therefore produces approximately 20 seconds between
request starts. A timestamp anchored to the first request tracks the wall-clock
deadline; re-check it before
each request, after each response and when the page becomes visible again.
Browser suspension can delay rendering the terminal state, but must never allow
an extra request once the deadline has passed.

An explicit Retry during active recovery cancels a scheduled delay and expedites
the next check. If a request is already running, reuse that request. It must not
reset the deadline or bypass the cap. Retry after exhaustion starts one fresh
bounded window. Disable repeated clicks while a request is running.

## 4. Visibility, connectivity and cancellation

Automatic requests run only with a mounted provider, a visible document and an
online browser. Cancel scheduled checks and abort an in-flight probe when the
page becomes hidden, goes offline or unmounts. A lifecycle abort is not evidence
of logout or a new server error.

Returning to visible/online may perform one immediate check if an existing
window still has time and requests left. It does not reset that window. If the
window expired while hidden/offline, show terminal recovery and require Retry.
If the initial mount was hidden/offline, defer the first request and start its
window only when it can run. An explicit Retry while offline performs no request;
its fresh window may start once online and visible again.

Disable session-query focus/reconnect auto-refetch behavior that could bypass
these rules. Leave unrelated query defaults and socket reconnection unchanged.
Normal app navigation inside the root provider must not restart the window.
Each browser tab owns its own window; no cross-tab storage or leader election is
required. Do not persist timers, deadlines, identities or errors in browser storage.

Use cancellation plus a generation/request identity so responses from an old
window, an unmounted provider or a pre-sign-out request cannot overwrite newer
state. Successful sign-out invalidates pending reads before writing signed-out
state. Preserve existing account-cache isolation and cleanup after authoritative
account changes. React Strict Mode must not leave duplicate timers or probes.

## 5. Result classification and identity safety

Keep authentication state distinct from recovery progress. Extend the session
reader's unavailable result with enough metadata for the coordinator to make
these decisions; do not infer the cause from UI text.

| Response/condition | Outcome |
|---|---|
| 200 with valid identity envelope | Authenticated; stop recovery and use the verified account. |
| 401 | Unauthenticated; stop recovery and reveal Sign in. |
| 408, 5xx, transport failure, request timeout, malformed/unexpected success body | Unavailable; continue within the current limits. |
| 429 | Stop automatic recovery; honor a valid `Retry-After` delay before enabling manual Retry. Support seconds and HTTP-date; default to 60 seconds if absent/invalid. Waiting alone must not send a new request. |
| Other 4xx, including 403 | Stop automatic recovery; show a blocked/unavailable message and manual Retry. Do not present it as startup or invalid credentials. |
| Hidden/offline/unmount cancellation | Pause/cancel work according to section 4; do not change identity based on the cancellation. |

Never turn unavailable into unauthenticated. An outage does not clear known
account/room caches as though the user logged out, fabricate a wallet balance,
authorize protected content, or open a Sign in form on the assumption of logout.
Keep private-content gating at least as strict as the existing unavailable state.

Automatically retry only the safe session GET. Do not replay sign-in, sign-up,
sign-out, email verification/reset, room creation/joining, poker commands or
cosmetic pulls. Successful session recovery may resume existing authorized data
reads and existing reconnect reconciliation; it cannot invent new mutation IDs.
The existing pending-invitation flow remains responsible for its explicit room
entry semantics; this coordinator does not submit invitations itself.

## 6. User experience and accessibility

Use the same recovery state and actions in `AccountAccess` and `SessionBoundary`.
Keep the shell, selected route and existing visual identity. Suggested exact copy:

| State | Copy and action |
|---|---|
| Initial request | “Checking access…” |
| Recoverable failure within the window | “Connecting to server…” with “The server may be waking up. This can take about a minute.” and Retry. |
| Deadline/cap reached | “Server unavailable. Please try again.” and Retry. |
| Offline | “You’re offline. Reconnect to continue.” |
| Rate limited | “Too many requests. Please wait before retrying.” with Retry disabled until eligible. |
| Other blocked request | “Unable to connect. Please try again.” and Retry. |

“May be waking up” deliberately conveys uncertainty: a timeout alone cannot
prove that Render is starting. No fake countdown to guaranteed availability.
Use an accessible polite status region, with no announcement on every timer
tick. Keep Retry keyboard-operable, visibly disabled while busy, and large enough
for touch. Do not move focus during each check or automatically open a modal.
If a focused Retry control disappears on recovery, move focus to its replacement
Sign in control or verified account control without opening Sign in. Avoid
horizontal overflow at 360 px; inspect the desktop header at 1440 px. Respect
reduced motion and preserve clear status text without animation.

## 7. Implementation map

| File | Intended responsibility |
|---|---|
| `apps/web/src/lib/auth-client.ts` | Cancelable, bounded session reads and failure metadata; retain current auth POST behavior. |
| `apps/web/src/features/auth/useSessionRecovery.ts` (new) | Recovery window, limits, deduplication, lifecycle, cancellation and progress state. |
| `apps/web/src/features/auth/SessionBoundary.tsx` | Integrate the coordinator into the shared provider and expose consistent recovery controls; preserve account cleanup. |
| `apps/web/src/features/auth/AccountAccess.tsx` | Consume shared recovery status; keep its isolated fallback using the same policy rather than a second production poller. |
| `apps/web/src/app/globals.css` | Only necessary responsive/status styling. |
| `apps/web/src/features/rooms/useRoomConnection.ts` | Retain connection ownership/caches during unverified session recovery while gating private views and commands. |
| `apps/web/src/features/rooms/ActiveRoomBoundary.tsx` | Preserve the current mounted destination through recovery; require every new pathname to pass navigation gating. |
| `apps/web/src/features/gacha/Banner.tsx` | Distinguish recovery from real account entry so restoring the same account cannot replay an uncertain purchase. |
| Existing auth tests plus `useSessionRecovery.test.tsx` (new) | Deterministic request, timer and lifecycle regressions. |
| `apps/web/tests/e2e/backend-recovery.spec.ts`, `session.spec.ts` | Automatic and terminal recovery through real UI; retain restart/privacy acceptance. |

Use the existing React/TanStack Query stack. Propagate the query cancellation
signal to `readSession`, preserving injectable readers used by current tests.
A shared presentational recovery component is appropriate if needed to prevent
copy/status divergence. Read applicable `AGENTS.md` and bundled Next.js guidance
before touching application files. This table is scope guidance, not application
code or a separately approved execution plan.

## 8. Acceptance and verification

Required deterministic tests use fake timers and controllable responses:

1. Initial 504 followed by 401 reveals Sign in without a click; 504 followed by
   valid 200 restores the verified account. No extra request follows success.
2. Persistent failures exhaust 90 seconds or 18 requests. A hung request is
   aborted at its bound; a response at/after the deadline cannot revive the window.
3. Five-second post-completion spacing, manual Retry spam, shared header/boundary
   consumers and Strict Mode never create overlapping requests or duplicate loops.
4. Hidden/offline pages send no automatic traffic. Resume inside the deadline
   checks once; resume after it requires Retry. Navigation retains the budget.
5. 429 and other 4xx do not retry automatically. Cancellation and stale reads
   cannot restore a signed-out account or leak a previous account's cached data.

Browser acceptance must cover automatic signed-out recovery, authenticated
recovery, terminal failure/manual restart, hidden/offline behavior, keyboard focus
and desktop/mobile layout. Simulate a backend unavailable for about 60 seconds,
including delayed responses rather than only immediate 503s. Use deterministic
route interception or the disposable test backend; do not poll production for
test fixtures. Retain the actual backend-restart and real Socket.IO tests.
Assert that the coordinator sends only GET `/api/me`, and does not automatically
resubmit authentication or gameplay mutations. Full 90-second timing boundaries
belong in deterministic tests; browser tests may use controlled clocks.

Start implementation with failing recovery tests, then add the coordinator and
shared UI. Run pinned `pnpm install --frozen-lockfile`, focused auth tests, the
configured aggregate `pnpm check`, and Chromium acceptance through the existing
isolated replica-set stack. Run frontend typecheck/build and relevant server/
transport coverage through those configured checks. No lint script currently
exists. Record actual failures and results instead of marking proposed checks
passed. Update `CHECKPOINT.md` and the `plan.md` checkpoint.

A real natural Render sleep/wake drill remains a separate, explicitly authorized
deployment/playtest check. Unit mocks cannot establish provider timing or policy
approval. No deployment or live database operation is authorized by this spec.

## 9. Handoff

The user requested implementation of PR #30 on 2026-10-14. The same open task
branch, `codex/server-recovery-spec`, implements this specification and updates
PR #30 targeting `dev`; the user merges manually. Verification and publication
evidence belongs in `CHECKPOINT.md` and the `plan.md` checkpoint. Preserve existing
hosting and mutation/idempotency contracts. No deployment or natural Render
sleep/wake drill is part of this implementation request.
