# Account email codes — verification and password reset

Status: **Draft for owner review. Product choices below were confirmed in the
2026-10-12 grill-me interview; the implementation design and technical defaults
still require review. No application changes or production fix are claimed.**

## 1. Problem and outcome

The owner reports that production is configured, but clicking an email-verification
link appears to do nothing and the account stays unverified. The exact production
failure has not been reproduced or diagnosed. Replacing the interaction with codes
is a requested product change, not evidence that the underlying production failure
has been fixed. Both new flows must be tested through the public Worker-to-Nest
route; changing email content alone cannot establish success.

Users will receive an emailed code, enter it in the app, and see an explicit result.
Email/password remains the login method. Existing account IDs, wallets, inventory,
registration access, and game authorization must be preserved.

## 2. Confirmed product decisions

| Question | Owner decision |
| --- | --- |
| Which flows use codes? | Email verification and password reset. |
| Login after email verification? | Return to password sign-in; retain the email field. No automatic sign-in. |
| Code lifetime? | 10 minutes, enforced by the backend. |
| Resend behavior? | Generate a new code and invalidate the previous one. Tell users to use the latest email. |
| Code format? | Six decimal digits, including leading zeroes. |
| Password-reset entry? | One form for code, new password, and confirmation after requesting the code. |
| Reset of an unverified account? | A successful reset also marks the email verified. Return to sign-in. |
| Previously emailed links? | Stop accepting them after cutover; direct users to request a new code. |

"Unique code" means a cryptographically random challenge bound to its account and
purpose. Six digits cannot guarantee global uniqueness across all users forever.
Prevent reuse of the immediately superseded code and avoid identical simultaneous
verification/reset codes for the same account; other accounts may receive the same
numeric string without sharing authorization.

## 3. Current implementation and constraints

Repository inspection at `origin/dev` `4c6b39b3` found:

| Area | Current behavior |
| --- | --- |
| `apps/server/src/modules/identity/auth.ts` | Better Auth 1.7.6, MongoDB adapter with transactions, email verification required outside the limited test bypass, same-origin callbacks, database rate limits, uncached database sessions. |
| `accountEmail.service.ts` | Brevo delivery sends verification/reset URLs. Memory delivery and IPC capture are test-only. |
| `atomicPasswordReset.ts` | Wraps the existing link-reset handler in a provider transaction. Its route is not the OTP reset route. |
| `IdentityService.resolve` | Rejects unverified identities when account recovery is enforced; HTTP and sockets share session authority. |
| `SignInButton.tsx` / `auth-client.ts` | Signup transitions to link-verification instructions; resend and forgotten-password requests use native auth routes. |
| `ResetPasswordForm.tsx` | Reads a reset token from the URL and submits a new password. |
| Test helpers and local account preparation | Read captured URLs and follow them to verify fixture accounts. They must move to native code confirmation without weakening production checks. |

The installed Better Auth email-OTP plugin supports six-digit codes, expiry,
attempt limits, stored-code transforms, default-verification override, and reset
codes. Inspection of its installed routes shows atomic OTP consumption, followed
by user/password/session updates. This does **not** prove whole-operation atomicity
or resend/failure-counter behavior when wrapped in a transaction. Regression tests
must decide whether a narrow wrapper or dedicated challenge operations are needed.

Reuse the existing provider/session infrastructure and pinned versions. Do not add
passwordless login, automatic signup through an OTP endpoint, email changes, or
unrelated dependency upgrades. Keep the shared registration-code hook intact.

## 4. User flows

### Email verification

Signup sends one verification code and opens the verification state with the email
already filled in. State clearly: **Check your email. Enter the six-digit code.
It expires in 10 minutes. Use the latest email if you resend.**

The verification state contains email, one code input, **Verify email**, **Resend
code**, and **Back to sign in**. Existing unverified users can reach the same state
from sign-in. An `EMAIL_NOT_VERIFIED` sign-in result leads there with the email
retained; it does not silently start a session or repeatedly send email.

Successful verification preserves identity, consumes the challenge, and returns
to sign-in with **Email verified. Sign in with your password.** Clear the code and
any previously entered password. A session check before password login must still
report unauthenticated for a signed-out user.

### Password reset

**Forgot password?** first requests an email address and sends a reset code. Show
the same response for existing and unknown accounts: **If that address has an
account, a reset code is on its way.**

Then display the retained email, code, new password, confirmation, **Change
password**, **Resend code**, and **Back to sign in**. Keep the existing 8–128
character password policy. Password confirmation is a browser check; the backend
must independently validate password policy before consuming a correct code.

Success atomically changes the password, verifies the email if needed, revokes all
older sessions, consumes and invalidates challenges as specified below, and returns to
sign-in with **Password changed. All previous sessions have been signed out.**
Retain the email; clear both password inputs and the code. Do not create a session.

### Errors and interruption

Wrong, expired, replaced, or exhausted codes show a clear inline error with a route
to resend. A wrong code preserves email and password input for correction. Local
password-policy/confirmation errors do not spend the code or increment its failure
budget. Changing the email clears the code and starts a fresh request state.

On backend startup, timeout, or delivery failure, preserve the email and show a
retry action. Do not label an unconfirmed reset successful or automatically retry
it with a different password. After an uncertain confirmation outcome, tell the
user to try signing in with the intended password, or request a fresh code. A retry
must never change a password a second time using a consumed challenge.

Reloading/closing clears transient secrets and lets the user resume by entering
their email and an existing code or requesting another. Provide a public reset
page that works without a query token; do not make opening an email link necessary.

## 5. Technical defaults proposed for review

These are engineering recommendations, not individually confirmed interview answers.

| Control | Proposed requirement |
| --- | --- |
| Wrong attempts | Five per challenge; the fifth wrong submission invalidates it. A correct sixth submission fails. Failed attempts survive restart and concurrent requests. |
| Resend cooldown | 60 seconds per normalized email and purpose, including signup-triggered issuance. Display a countdown, but enforce it in the database. |
| Broader rate bounds | Maximum five issuances per email/purpose per hour and 20 send attempts per trusted client IP per hour. Confirmation has an IP bound of 30 attempts per 10 minutes in addition to the challenge budget. Count attempts across aliases; return 429 with a usable retry interval. |
| Code storage | Persist only a server-keyed hash of the code, with a domain-separated key derived from the existing server-only auth secret. Never store plaintext codes in MongoDB. |
| Scope | Normalize email consistently with Better Auth. Bind challenges to account identity and purpose; verification codes cannot authorize reset. |
| Lifetime | 600 seconds from committed issuance; expiry is authoritative even before TTL cleanup. Resend starts a new lifetime and generation. |

Rate responses must not disclose account existence. Apply address/IP counters to
unknown-account requests too, without creating accounts or a usable challenge.
Preserve the trusted proxy IP boundary; a browser-supplied forwarding header cannot
select the rate-limit identity. Keep counters bounded and cleanable.

Codes, passwords, reset tokens and sessions must never enter URLs, browser storage,
logs, analytics, screenshots, traces, committed fixtures, or public test endpoints.
The existing ignored local credential file and loopback-only test capture remain
limited testing facilities; do not expose OTP capture in production.

## 6. Backend contract and consistency

Use native auth responses on `/api/auth/*`, outside the application `Result`
envelope, with `no-store` and the existing public-origin/proxy checks.

Candidate routes supported by the pinned provider, subject to the consistency
requirements rather than simply exposing its entire plugin:

| Operation | POST path | Input |
| --- | --- | --- |
| Request verification code | `/api/auth/email-otp/send-verification-otp` | `email`, fixed `type: 'email-verification'` |
| Confirm verification | `/api/auth/email-otp/verify-email` | `email`, `otp` |
| Request reset code | `/api/auth/email-otp/request-password-reset` | `email` |
| Confirm password reset | `/api/auth/email-otp/reset-password` | `email`, `otp`, `password` |

Successful confirmation returns a minimal success response and no login token or
new session cookie. Map invalid/expired/exhausted challenges to safe client error
codes; distinguish transient storage failures from invalid credentials. Request
responses are generic for eligible, ineligible and nonexistent addresses. Handle
email-provider outages without an account-existence signal or a false delivered
claim; success copy says **If eligible**, not **Email delivered**.

The challenge state machine must enforce:

1. One current challenge per normalized email and purpose, with a generation,
   expiry, failure count and single-use status. Issuance/replacement is serialized
   in persistent state; simultaneous resends cannot leave multiple usable codes.
2. A wrong-code outcome commits its failure count before returning an error.
   Throwing inside a transaction must not roll back this security counter. A
   concurrent old failure cannot resurrect or overwrite a newly issued challenge.
3. Verification commits challenge consumption and `emailVerified: true` together.
   Reset commits consumption, password update, email verification and revocation
   of all older sessions together. A failure leaves no partial password/session
   state, and a valid challenge remains recoverable after an aborted transaction.
4. Exactly one concurrent correct confirmation succeeds. The losing reset cannot
   overwrite the winner's password. Resend racing confirmation has a defined
   serialized outcome; an invalidated generation cannot succeed later.
5. A successful password reset invalidates any outstanding verification and reset
   challenge for that account. No stale code can act after reset or another success.

Hash new passwords with the configured provider implementation. Generate random
codes once per issuance outside retryable transaction callbacks. External Brevo
delivery happens after persistence, never inside a retryable transaction. Only
the latest generation is usable if email arrives out of order. A failed or timed-out
delivery cannot create two valid generations; offer resend after cooldown. Persisted
challenges/counters survive a Render restart; do not rely on an in-memory queue
alone. Await bounded email delivery or use an already supported durable mechanism;
do not introduce an untracked fire-and-forget send.

Do not assume the provider plugin's default options meet these requirements. Keep
OTP sign-in, change-email, OTP retrieval/creation/check routes, deprecated reset
aliases, and alternate code-purpose dispatch unavailable externally unless needed
for the four approved operations. `disableSignUp` alone does not disable login.
Audit all mounted routes for a bypass of attempt limits, legacy-link retirement,
registration access, or the no-automatic-login decision.

Any necessary index/validator change must be additive, safe for existing auth data,
idempotent under repeated migration, and tested on an isolated replica set. Record
whether a migration is required before rollout; no live migration is authorized.

## 7. Email and UI requirements

Brevo messages use distinct **Verify your email** and **Reset your password**
subjects, a prominent plaintext six-digit code, its 10-minute expiry, and **Use the
latest code. Do not share it.** Recovery emails contain no verification/reset links.
Do not send an unexpected duplicate email after signup or resend.

Reuse the existing auth dialog, theme and public reset page. Use a single text code
input with a visible label, `inputMode="numeric"`, `autoComplete="one-time-code"`,
six-digit validation and leading-zero preservation. Support typing and pasting;
trim surrounding whitespace without accepting malformed codes. Avoid six separate
inputs or an unsolicited automatic submission.

Keep submit/resend actions disabled while their own request is pending; expose
status and errors accessibly. Retain modal focus containment and Escape/close
behavior. On transitions, focus the relevant input or result. Password visibility
controls, if used, must remain keyboard accessible. Verify keyboard navigation,
mobile viewport/virtual-keyboard use, desktop layout, and absence of horizontal
overflow. A countdown must not create an announcement every second.

## 8. Old-link retirement and release boundary

After coordinated cutover, old verification/reset GET links lead to the correct
request-code surface with **This link has been replaced. Request a new code.**
Strip token/error query values from the destination URL and avoid echoing them.
GET must not verify an account, reset a password, consume a token, or automatically
send email. Legacy POST endpoints must not continue accepting token resets or
issuing fresh link emails. Handle direct visits to `/reset-password?token=...`
similarly; changing only the frontend is insufficient.

Old tokens may expire naturally in storage once no route can accept them. No bulk
account deletion, blanket verification, password replacement, or production data
cleanup is part of this change. Existing verified accounts and sessions remain
usable; only an explicit successful reset revokes that account's sessions.

The owner reports production setup; hosted acceptance remains unverified in this
task. A later release must account for separate Worker/backend deploys: prepare
required additive schema first, coordinate the frontend and backend versions,
avoid live games during replacement, and verify actual Brevo delivery through the
public origin. Spec approval does not authorize deployment, live database work,
provider updates, or merging. The owner merges manually.

Rollback must not re-enable old link acceptance or resurrect consumed challenges.
Prefer a compatible corrective release; if recovery must be paused, provide a
clear unavailable state while preserving existing account sign-in. Record this
constraint in deployment documentation before rollout.

## 9. Required acceptance evidence for implementation

| Area | Evidence |
| --- | --- |
| Verification | Native signup issues exactly one six-digit email; user cannot sign in before verification; entering a valid code preserves account ID and verifies it without a session; password login then succeeds. Existing unverified accounts use the same flow. |
| Reset | Verified and unverified accounts can reset in one form; password policy/mismatch does not consume a valid code; success verifies the email, preserves account/wallet/inventory, revokes old HTTP and socket access, and requires password login. Old password fails. |
| Challenge lifecycle | Wrong code, expiry at 600 seconds, leading zeroes, fifth failed attempt, reuse, cross-account/purpose, cooldown, hourly bounds, restart, delayed email order and replacement all have deterministic assertions. |
| Races and rollback | Real MongoDB replica-set tests cover concurrent correct submits, wrong-attempt accounting, resend versus confirmation, wrong submit versus resend, and faults between consume/password/verification/session operations. Exactly one password wins; no partial updates or resurrected codes. |
| Provider and privacy | Real auth mount with native cookie behavior; unknown-address generic responses; email/storage outage without account disclosure; hostile Origin/direct-backend denial; codes absent from database plaintext, URLs, logs and production capture routes. Disabled OTP/legacy aliases cannot bypass controls. |
| Browser UX | Real Chromium signup/verify/login and reset/login, existing unverified account, resend/latest-code error, expiry/error recovery, tab refresh, keyboard/focus, one-field paste, password mismatch, and desktop/mobile responsive inspection. Disable traces containing passwords/codes. |
| Legacy URLs | Old verification/reset links show the request-code explanation; GET changes no account or token state and sends no email; old POST/token routes cannot reset or send links. |
| Public deployment | Separately authorized check proves actual Brevo delivery, both POST flows through Worker-to-Nest, database changes, secure cookies on subsequent password login, and clear errors. Do not claim the reported production bug fixed from local evidence alone. |

Implementation verification uses the pinned pnpm 10.33.0 and frozen lockfile,
focused server/web tests, `pnpm check`, and the configured
`pnpm --filter @poker/web test:e2e` suite against isolated test data. Worker bundle
verification runs in the supported Linux environment/CI. Update E2E email capture,
native account helpers and local mock account preparation to submit codes, not
seed verified flags or restore removed shortcut login endpoints.

## 10. Next review and evidence status

Product interview is complete. Next: owner reviews this written spec, especially
the proposed attempt/rate defaults. Approval permits writing the executable
implementation plan with file boundaries, route/transaction regression cases,
local verification and release gates. It does not claim the code is implemented.

This document was prepared from repository and installed-provider inspection.
Application tests, real email delivery, production diagnosis and deployment were
not run for this documentation task. The reported live failure remains unresolved
until implementation and authorized hosted acceptance provide evidence.

Reference: [Better Auth email OTP documentation](https://better-auth.com/docs/plugins/email-otp).
Installed 1.7.6 source is the compatibility authority; current website examples
must not silently change the pinned version or widen the approved flow.
