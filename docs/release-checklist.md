# Private release checklist

Use this checklist for a specific candidate revision. Record actual evidence beside
each gate; unchecked items block release. M0-M4 are merged locally, but the full M5
friends release is not verified. Deployment and live database actions require the
operator's explicit authorization as described in [deployment.md](deployment.md).

## Candidate record

- CI/build slice with clock correction: `b614e003`, draft [PR #15](https://github.com/24-HUB/poker-game/pull/15)
  to `dev`; final release candidate remains pending the remaining M5 gates.
- Runtime: Node 22.16.0 and pnpm 10.33.0, pinned in the repository.
- Frontend adapter: OpenNext Cloudflare 1.20.6; Next.js 16.3.6.
- Reward policy: v1; catalogue: immutable `celestial-v1`.
- Environments and encrypted backup destination: pending. The user is the backup
  operator; recovery/retention targets approved 2026-10-07 are in [operations.md](operations.md).

## Local and CI gates

- [x] Frozen install and `pnpm build:server` from fresh source without cached `dist`.
  Verified locally 2026-10-06; the old Render sequence failed before the fix.
- [x] Migration idempotency on a disposable MongoDB replica set, two successful runs.
- [x] `pnpm check`: 174 server, 68 web, 15 contracts, 18 engine and three script tests,
  typechecks and production builds passed locally 2026-10-07. No lint script exists.
- [x] Linux OpenNext Worker packaging on correction candidate `b614e003`.
- [x] Full Chromium suite in CI: accounts, rooms, takeover, restart, poker, tickets,
  interrupted pull recovery, equipment and persistence.
  Two local runs with `CI=true` passed 28/28 on 2026-10-07; [Linux candidate CI](https://github.com/24-HUB/poker-game/actions/runs/37617148673/job/112778136755)
  passed 14/14. Earlier Linux passed 13/14 and failed the collection actor wait.
  Recheck the documentation follow-up's final head before manual merge.
- [x] Absolute game-clock deadlines survive early native callbacks and cancellation.
  Five deterministic regressions passed; real fixed-clock probe had zero early
  callbacks out of 500 (native probe before correction: 11 early). The exact
  earlier CI failure state was not captured; sanitized diagnostics are retained.
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
- [x] Recovery targets/retention and backup operator approved 2026-10-07.
- [x] Local encrypted backup/restore drill with scoped credentials: collection
  metadata/counts, economy audit, restored sign-in, receipt replay, ownership/equipment
  passed. First drill restored in 777 ms, procedure 8,007 ms, zero fixture loss.
  See [operations.md](operations.md) for timestamp/checksum and measurement limits.
- [ ] Select encrypted external destination/budget and rehearse retained-key access.
- [ ] Perform authorized hosted backup/restore and compare actual loss/time to targets.
- [ ] Record known issues, rollback revision and compatibility, and release decision.

See [M5-M7 in the implementation plan](superpowers/plans/2026-09-30-m3-through-production.md)
for hosted, recovery, cutover and operations steps. The user reviews and merges the
task PR manually; merging does not authorize deployment.
