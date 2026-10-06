# Private release checklist

Use this checklist for a specific candidate revision. Record actual evidence beside
each gate; unchecked items block release. M0-M4 are merged locally, but the full M5
friends release is not verified. Deployment and live database actions require the
operator's explicit authorization as described in [deployment.md](deployment.md).

## Candidate record

- Candidate commit and PR: pending the M5.1 handoff.
- Runtime: Node 22.16.0 and pnpm 10.33.0, pinned in the repository.
- Frontend adapter: OpenNext Cloudflare 1.20.6; Next.js 16.3.6.
- Reward policy: v1; catalogue: immutable `celestial-v1`.
- Environments, operator and approved recovery targets: pending.

## Local and CI gates

- [x] Frozen install and `pnpm build:server` from fresh source without cached `dist`.
  Verified locally 2026-10-06; the old Render sequence failed before the fix.
- [x] Migration idempotency on a disposable MongoDB replica set, two successful runs.
- [x] `pnpm check`: 169 server, 68 web, 15 contracts, 18 engine and three script tests,
  typechecks and production builds passed locally 2026-10-06. No lint script exists.
- [ ] Linux OpenNext Worker packaging on the candidate commit.
- [ ] Full Chromium suite in CI: accounts, rooms, takeover, restart, poker, tickets,
  interrupted pull recovery, equipment and persistence.
  Local run with `CI=true` passed 14/14 on 2026-10-06; Linux CI remains pending.
- [x] CI/build slice diff reviewed independently; no actionable finding. This is
  not a release-wide review of remaining M5 work.

CI does not upload traces, screenshots, video or raw browser reports. Keep local
captures private and redact cookies, tokens and private cards before sharing evidence.

## Remaining M5.1 work

- [ ] Server-only session admission and economy maintenance controls with race tests.
- [ ] One active session room globally, including concurrent starts and retries.
- [ ] Committed receipt replay remains available while new purchases are blocked;
  admitted durable work resolves and committed balances remain intact.
- [ ] Two- and six-player play, disconnect/expiry/takeover, all-in and side-pot results,
  desktop and 360 px layouts, focus, contrast, touch and reduced motion inspected.

## Hosted and recovery gates

- [ ] Authorize the concrete Cloudflare/Render/Atlas playtest environment and revision.
- [ ] Verify Brevo delivery and recovery with the approved sender and existing accounts.
- [ ] Complete the friends loop through the public Worker using real test accounts.
- [ ] Exercise backend sleep, restart and reconnect; interrupted hands award no tickets.
- [ ] Verify proxy trust, private cards, account isolation and provider quota headroom.
- [ ] Approve recovery targets and operator; perform an isolated backup/restore drill.
- [ ] Record known issues, rollback revision and compatibility, and release decision.

See [M5-M7 in the implementation plan](superpowers/plans/2026-09-30-m3-through-production.md)
for hosted, recovery, cutover and operations steps. The user reviews and merges the
task PR manually; merging does not authorize deployment.
