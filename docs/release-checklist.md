# Private release checklist

Use this checklist for a specific candidate revision. Record actual evidence beside
each gate; unchecked items block release. M0-M4 are merged locally, but the full M5
friends release is not verified. Deployment and live database actions require the
operator's explicit authorization as described in [deployment.md](deployment.md).

## Candidate record

- Current execution: [2026-10-17 private-release inventory](releases/2026-10-17-private-release.md),
  implementing the plan in [PR #32](https://github.com/24-HUB/poker-game/pull/32).
  Candidate `0d4ae28a9c404de8d7d9db089543a60e1fe18673` has successful
  [exact merged-candidate CI](https://github.com/24-HUB/poker-game/actions/runs/38996688408/job/117290696108)
  and is the observed live Render and active Worker revision (Worker `483fb438`,
  100% traffic before maintenance). During the authorized attended window, a
  consistent encrypted source backup and isolated authenticated restore passed;
  migrations 001–007 are now verified after two successful runs. Durable
  progression is unchanged. Paired proxy-secret rotation and public smoke passed
  at 20:25 Bangkok; backend is online, original admission true/economy false and
  original provider automatic updates are restored. Hosted full-flow acceptance
  remains open. Older
  candidate records below are historical evidence, not current release approval.
- M5.1 CI/build correction merged in [PR #15](https://github.com/24-HUB/poker-game/pull/15).
  M5.2 local recovery implementation merged in [PR #16](https://github.com/24-HUB/poker-game/pull/16).
  [Merged dev CI](https://github.com/24-HUB/poker-game/actions/runs/37771118582)
  passed on `08e67c82` on 2026-10-08. Final release candidate remains pending M5 gates.
  M5.1 controls: `c4462714`, draft [PR #17](https://github.com/24-HUB/poker-game/pull/17)
  targets `dev`; inspect its final-head checks separately.
- Runtime: Node 22.16.0 and pnpm 10.33.0, pinned in the repository.
- Local gameplay acceptance: `d4c2373c`, draft [PR #18](https://github.com/24-HUB/poker-game/pull/18),
  base `dev`, from `5decc3eb` (controls PR #17 merged). Final-head candidate CI
  remains pending; local evidence below does not authorize deployment.
- Frontend adapter: OpenNext Cloudflare 1.20.6; Next.js 16.3.6.
- Reward policy: v1; catalogue: immutable `celestial-v1`.
- Environment classification remains pending. Operator selected `D:\PokerBackups`
  on the internal SSD on 2026-10-17; private ACLs and synthetic encryption/retrieval,
  wrong-key and tampered-file rejection passed. Operator reports successful
  handwritten-key recovery. Direct encrypted MongoDB stream and network-none
  authenticated audit preflights pass. Approved suspension/consistent source capture
  and retained-archive isolated restore passed at 20:06–20:10 Bangkok, with matching
  metadata/counts/fingerprints/economy. The exact results and next step are in the
  release record; restored-auth/full hosted acceptance remains open.
  The user is the backup
  operator; recovery/retention targets approved 2026-10-07 are in [operations.md](operations.md).

## Local and CI gates

- [x] Frozen install and `pnpm build:server` from fresh source without cached `dist`.
  Verified locally 2026-10-06; the old Render sequence failed before the fix.
- [x] Migration idempotency on a disposable MongoDB replica set, two successful runs.
- [x] `pnpm check`: 174 server, 68 web, 15 contracts, 18 engine and three script tests,
  typechecks and production builds passed locally 2026-10-07. No lint script exists.
  Controls candidate 2026-10-08 passed 191 server, 68 web, 15 contracts, 18 engine,
  29 economy and three script tests (324 total), typechecks and production builds.
- [x] Linux OpenNext Worker packaging on correction candidate `b614e003`.
- [x] Full Chromium suite in CI: accounts, rooms, takeover, restart, poker, tickets,
  interrupted pull recovery, equipment and persistence.
  Two local runs with `CI=true` passed 28/28 on 2026-10-07; [Linux candidate CI](https://github.com/24-HUB/poker-game/actions/runs/37617148673/job/112778136755)
  passed 14/14. Earlier Linux passed 13/14 and failed the collection actor wait.
  Recheck the documentation follow-up's final head before manual merge.
  Controls candidate's final local Chromium passed 14/14 without retries. The new
  limit exposed collection-test session leakage, fixed via real session completion.
  A separate transient restart assertion failed once; focused 6/6 and final full
  14/14 passed. Its exact cause remains unestablished; sanitized diagnostics remain.
- [x] Absolute game-clock deadlines survive early native callbacks and cancellation.
  Five deterministic regressions passed; real fixed-clock probe had zero early
  callbacks out of 500 (native probe before correction: 11 early). The exact
  earlier CI failure state was not captured; sanitized diagnostics are retained.
- [x] CI/build slice diff reviewed independently; no actionable finding. This is
  not a release-wide review of remaining M5 work.

CI does not upload traces, screenshots, video or raw browser reports. Keep local
captures private and redact cookies, tokens and private cards before sharing evidence.

## Remaining M5.1 work

- [x] Server-only session admission and economy maintenance controls with race tests.
- [x] One active session room globally, including concurrent starts and retries.
- [x] Committed receipt replay remains available while new purchases are blocked;
  admitted durable work resolves and committed balances remain intact.
  Locally verified 2026-10-08 with real replica-set and authenticated HTTP/Socket.IO
  tests on `codex/m5-maintenance-controls`. Production defaults keep
  admission/purchases closed when flags are absent. The current
  blueprint explicitly enables admission and disables purchases; inspected live
  values matched on 2026-10-17. Review the
  task PR and its final-head CI before integrating; these checks do not authorize deployment.
- [x] Two- and six-player play, disconnect/expiry/takeover, all-in and side-pot results,
  desktop and 360 px layouts, focus, contrast, touch and reduced motion inspected.
  Locally verified 2026-10-10: `pnpm check` passed 327 tests, typechecks and production
  builds; final Chromium under `CI=true` passed 16/16 with zero retries. New release
  flows passed three repeat rounds (6/6); existing real Socket.IO tests cover persisted
  expiry, revoked recipients and takeover. Six-account all-ins conserve 6,000 chips;
  heads-up reconnect restores private cards and new-tab control removes old-tab actions.
  Four hand/result captures at 360×800 and 1440×1000 were inspected. Keyboard raise
  has a visible focus outline and a 44×44 minimum target; reduced motion is exercised.
  Felt text's conservative contrast is 5.04:1 (previously 4.11:1).
  Disconnect publication and committed/ended pot projections were corrected with
  failing real-replica/transport regressions. Uncalled returns do not become side pots.
  One intermediate full browser run failed its caller selector; atomic DOM reads remove
  that race, but the original exact failure cause remains unproven. Sanitized diagnostics
  remain. Review's pot finding is resolved; no remaining actionable findings.
  These scoped checks are not an exhaustive accessibility certification.

## New pre-deployment UX gates — requested 2026-10-11

Resumed verification on `codex/m5-predeploy-ux`, 2026-10-12: responsive blockers
are corrected, actual mobile own-turn and 1280×720 visibility assertions pass, and
full local CI-mode Chromium is 19/19 with zero retries. Final aggregate passes 372
tests/types/builds, plus direct native history HTTP guard coverage. Restart recovery
passes at original bounds on fresh services; its earlier historical cause is unproven.
Linux CI on `6f358fa1` passed 374 aggregate tests, backup/restore, Worker packaging
and 19/19 Chromium at unchanged viewport bounds. See
[the verified run](https://github.com/24-HUB/poker-game/actions/runs/38196054989)
and `CHECKPOINT.md`. Automated gates are complete; owner review/merge stays manual.

Earlier passing gameplay evidence remains historical. The user requires these
additional improvements before production; implement and verify them before the
next hosted candidate using [M5.1a](superpowers/plans/2026-09-30-m3-through-production.md#m51a--required-local-playtest-ux-improvements-before-deployment).

- [x] Authenticated current-room recovery after refresh/sign-in; ordinary in-app
  navigation stays at the playing table, with explicit leave/sign-out and safe
  completion/restart/expired-session recovery.
- [x] Playing-room layout makes your cards, turn/timer, board/pot and betting controls
  readable on desktop/tablet/phone and meets the full
  [Poker Room UX/UI specification](superpowers/specs/2026-10-11-poker-room-ux-ui.md):
  compact header/options; stable caller-relative seats and dealer/blind markers;
  desktop table/actions visible together; mobile bottom panel/safe areas; no overlap.
- [x] Input/slider/presets share a validated legal amount with clear Raise-to semantics;
  updates preserve edits; pending/failure/reconnect states prevent duplicate/stale actions.
  Inline errors, keyboard/focus/labels and non-repeating timer announcements are verified.
- [x] Live hand number/blinds and on-demand completed-hand history use authorized
  server data, with privacy/pagination/account-isolation checks. Destination navigation
  uses deliberate leave, confirming only active-hand consequences; host ending stays visible.
- [x] Invitation generation displays/copies only the secure invite code; Guest joins
  by code; expiry, rotation, privacy and existing fragment-link compatibility remain verified.
- [x] Mock Host/Mock Guest can enter the loopback test stack without manual signup,
  email verification or credential typing; production has no fixture login/seeded accounts.
  Sign-in 403 errors no longer incorrectly report an invalid registration code.
- [ ] New candidate passes relevant regressions, full aggregate/Chromium and Linux
  Worker CI, with scoped visual evidence and a manually reviewed PR to `dev`.
  Automated/visual parts passed on `6f358fa1`; owner review and manual merge remain.

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
- [x] Selected local destination/key recovery: internal D: accepted by operator,
  synthetic tests passed; operator reports handwritten-key sample recovery success.
  Direct age stream and isolated authenticated read-only audit preflights passed.
- [ ] Perform authorized hosted backup/restore and compare actual loss/time to targets.
- [ ] Record known issues, rollback revision and compatibility, and release decision.

See [M5-M7 in the implementation plan](superpowers/plans/2026-09-30-m3-through-production.md)
for hosted, recovery, cutover and operations steps. The user reviews and merges the
task PR manually; merging does not authorize deployment.
