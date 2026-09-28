# M0/M1 Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Every behavioral change follows superpowers:test-driven-development.

**Goal:** Deliver the local, production-shaped M0/M1 vertical slice: workspace, authoritative backend, transactional persistence, invite-only email/password authentication, approved responsive lobby, and secure private rooms.

**Architecture:** A Next.js App Router frontend and Cloudflare Worker proxy call a separate NestJS/Express and Socket.IO backend. MongoDB replica-set transactions provide persistence; one fenced backend process owns rooms. The browser submits intent and renders recipient-specific server snapshots.

**Tech Stack:** TypeScript, pnpm workspaces, Next.js, Tailwind CSS, TanStack Query, Zustand, NestJS, Socket.IO, Better Auth, MongoDB official driver, Zod, Vitest, Jest, Playwright.

**Spec:** `plan.md`, `design.md`, and `docs/superpowers/plans/2026-09-26-design-to-production.md`, as amended by this approved plan.

## Global Constraints

- Work only on `codex/m0-m1-foundation`, created from freshly fetched `origin/dev`; the pull request targets `dev` and the user merges manually.
- M2 poker, M3 tickets, M4 cosmetics, M5 hardening, cloud provisioning, live secrets, and production database operations are out of scope.
- Use invite-only email/password authentication. Registration accepts display name, email, password, and a shared code checked against `REGISTRATION_INVITE_CODE_SHA256`; verification, outbound email, and password reset are deferred.
- Rooms are participant-only. A second connection gains mutation control only through explicit takeover.
- Preserve the `{ data, error }` envelope and package names `@poker/contracts`, `@poker/server`, and `@poker/web`.
- Use RED -> verified failure -> minimal GREEN -> verified suite -> refactor. Configuration and prose use build/diff checks instead of artificial source-text tests.
- Update `CHECKPOINT.md` at every task boundary and immediately if either usage window has less than 6% remaining.
- Pinned foundation matrix: Node 22.16.0, pnpm 10.33.0, TypeScript 5.9.3, Next.js 16.3.6, React 19.3.0, NestJS 11.2.6, Better Auth 1.7.6, Zod 4.6.5, Vitest 5.0.2, Jest 29.7.0, OpenNext Cloudflare 1.20.6, and Wrangler 4.125.0.

## Review Focus

1. Invalid registration codes cannot create accounts and never appear in logs or persistence.
2. Backend unavailability is not rendered as logout, and uncertain mutations keep their command identity.
3. Invitation tokens never enter requests, logs, analytics, broadcasts, or durable browser storage.
4. A stale tab or backend owner cannot mutate after takeover.
5. Full six-seat rooms, long names, errors, focus, and artwork remain usable at 360 px portrait width.

---

### Task 1: Bootable workspace and shared contracts

Create the pnpm workspace, strict TypeScript baseline, shared result schemas, reusable Nest bootstrap, health endpoint, minimal Next.js App Router shell, and initial test/build tooling. Start with failing result-schema and real Nest bootstrap tests, then prove workspace typechecks and both production builds.

### Task 2: Approved responsive application shell

Port the reviewed blue/white lobby composition into focused React components and design tokens, with the provisional character asset and provenance. Start with component behavior and dialog-focus tests; finish with Playwright coverage at 360x800, 900x900, and 1440x1000.

### Task 3: Replica-set persistence and migrations

Add the disposable MongoDB replica set, singleton database module, transaction runner, additive migrations, validators, and M0/M1 indexes. Start with rollback and occupied-seat uniqueness failures; verify idempotent migrations and rejection of standalone MongoDB.

### Task 4: Fenced backend authority

Implement lease acquisition, renewal, fencing, cleanup, readiness, and shutdown. Start with concurrent-owner, stale-epoch, and standby-health tests against real Nest processes and the replica set.

### Task 5: Fixed-upstream Worker proxy

Implement exact API/Socket.IO routing, fixed upstream selection, proxy-secret enforcement, origin validation, redirect/cookie preservation, timeouts, and real upgrades. Start with hostile-upstream, direct-backend, cookie, and upgrade tests.

### Task 6: Invite-only email authentication and session UI

Mount Better Auth before application body parsers, enable email/password, validate and strip the shared registration code in an exact signup hook, and share uncached identity resolution between HTTP and sockets. Build sign-up/sign-in and distinct authenticated, unauthenticated, loading, and unavailable UI states. Start with invalid-code, native-body, forgery, revocation, outage, and account-clearing tests.

### Task 7: Authoritative rooms, invitations, seats, and control

Implement shared room contracts, secure fragment invitations, persistence, command deduplication, global/per-room queues, participant-only access, seat assignment, host transfer, and explicit control takeover. Start with last-seat, lost-ack, outsider-sync, payload-conflict, and stale-disconnect tests.

### Task 8: Realtime delivery and reconnect bounds

Connect validated Socket.IO commands to the room service, reauthorize each delivery, publish recipient-specific snapshots after commit, and enforce socket, payload, rate, sync, and queue limits. Start with real-client ack, reconnect, revocation, overflow, and token-nondisclosure tests.

### Task 9: Integrated private-room web flow

Build invitation capture, create/join, seat movement, host controls, invitation rotation, reconnect, pending-command recovery, explicit takeover, sign-out isolation, and accessible failure states. Start with invitation parsing, snapshot ordering, lost-command identity, two-account, full-room, takeover, and server-wake tests.

Checkpoint 2026-09-28: in progress. The unit-tested session/store/socket foundation and responsive create/join/six-seat room UI are implemented. Next is real-browser two-account, full-room, reconnect, invitation-through-sign-in, and takeover acceptance. Do not mark Task 9 complete until those Playwright cases and full workspace verification pass.

### Task 10: Local acceptance and deployment preparation

Add CI, Render and Worker configuration, environment documentation, accessibility coverage, and non-secret deployment smoke tooling without provisioning providers. Run frozen install, migrations twice, `pnpm check`, builds, real local Socket.IO and replica-set flows, browser suites, visual checks, diff checks, and whole-branch review. Record deployed M0 acceptance as `not run - deployment not authorized`.

## Handoff

Fetch `origin` again, report whether the branch contains current `origin/dev`, push the explicit task branch, and create a pull request with base `dev`. Never merge, enable auto-merge, or delete the branch.
