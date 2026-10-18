# Friends playtest execution — 2026-10-18

Status: plan, Package A and the presented temporary-access package approved for
continuation. Provisioning role and six-hour single-IP rule are applied; database
user was created by the operator and its scope/expiry verified. Private helper
inputs and execution remain with the operator. No hosted A/B accounts
created yet. New hosted acceptance gates have not passed. No application deployment,
release-flag/economy change or deliberate gameplay interruption has been performed.

## Wrapper compatibility correction — 20:44 Bangkok

- Operator reported `ArgumentList.Add` failing on a null value after private
  inputs. Reproduced the exact exception with a credential-free
  `ProcessStartInfo` probe in Windows PowerShell 5.1.26100.9711; PowerShell 7.6.5
  exposes the required API. The reported failure precedes `Process.Start`, so
  that attempt launched no Node process and submitted no account transaction.
- Added `#Requires -Version 7.0`, rejecting the unsupported host before private
  prompts. Behavioral regression first failed because 5.1 reached Read-Host,
  then passed with `ScriptRequiresUnmatchedPSVersion` and no prompt output.
  The Windows regression skips on other operating systems. README clarifies
  `pwsh` and full-path invocation when it is absent from the operator's PATH.
- Provided the locally installed PowerShell 7 executable path for a fresh dry
  run. Prior inputs were not saved; operator must re-enter them privately.
  No hosted account success or new acceptance evidence is claimed.
- Verification completed 20:48 Bangkok: frozen install, `pnpm typecheck`,
  `pnpm test` (534 passed, including provisioning 3/3), `pnpm build`, PowerShell 7
  syntax and whitespace checks passed. Docker was initially stopped; started
  local Desktop and existing disposable MongoDB services, then `pnpm db:init`.
  No hosted database used for tests. Prior helper CI remains historical;
  new-head Linux CI is pending. Branch still includes current `origin/dev`.

## Access setup resumed — 20:26–20:36 Bangkok

- User requested continuation immediately after the exact role/six-hour-user/IP
  package was presented. Resumed clean existing branch `codex/friends-playtest-spec`
  at `32e12ad5`; origin fetch succeeded and current `origin/dev` `fe654481` remains
  included. Existing source progression stays preserved.
- [Helper-head Linux CI run 39098342866](https://github.com/24-HUB/poker-game/actions/runs/39098342866)
  on `32e12ad5` is completed/success; required verify job and all its steps succeeded.
  PR #34 remains open/draft, base `dev`, unmerged. No local application suite
  repeated for this operational/documentation continuation.
- Created `playtestAccountProvisioner20261018`. Read-back lists exactly `find`
  and `insert`, each scoped to `poker_playtest.user` and `poker_playtest.account`.
  No wildcard namespaces or inherited roles. It is assigned only to the new
  temporary provisioner below. Atlas applied its normal auth
  configuration update; no application deployment was requested.
- The Atlas banner's Add Current IP shortcut created an immediate nonexpiring
  entry rather than opening the temporary form. Removed **only that just-created
  current-IP entry**, then used Add IP Address to create its proper replacement
  with the temporary toggle on and duration six hours. Existing three rules were
  untouched. This correction was disclosed during execution.
- Fresh read-back: one entry with comment
  `friends-playtest-provisioning-20261018`, includes the current IP only, **Active**,
  initial countdown 06:00 and then 05:58. Public IP is retained only in the provider
  and private browser state, not this record. It expires six hours after creation,
  around 02:31 Bangkok on 2026-10-19; the countdown is authoritative.
- Operator created database user `poker_provisioner_20261018` after the handoff:
  zero built-in roles, one selected custom role above, restricted access enabled
  with only Cluster0 listed, Temporary User on, six hours selected. Agent has
  entered or read no password. After the operator replied “i already add,” the
  resulting user row confirmed SCRAM, the exact custom role, one cluster and
  six-hour countdown (06:00). No credential was requested in chat or Git.
- Next: operator runs the reviewed helper's masked prompts for a dry run, then
  `-Apply` with its exact confirmation phrase for the two-account transaction.
  An app terminal was opened and private input handoff issued. Source account
  creation remains unexecuted; do not infer success from Atlas user creation.
  Verify both ordinary public-app sign-ins and zero balances after `created`.
  Recheck the IP/user expiry if resuming after the six-hour window.
- Usage rechecked about 20:36 Bangkok: five-hour 79%, weekly 84% remaining;
  reset times unchanged below. No reset credit used.
- Usage at resumption 20:25:57 Bangkok: five-hour 100%, weekly 87% remaining;
  five-hour reset 2026-10-19 01:25:56 Bangkok, weekly reset
  2026-10-25 07:52:38 Bangkok. No reset credit was used.

## Direct provisioning preparation — historical 11:33–11:47 Bangkok

- User asked “is it still use email ? could you create in database ?”. This
  supersedes the prepared browser-registration handoff: leave those forms
  unsubmitted. Create new A/B through a one-time operator operation, not a new
  public endpoint or a change to deployed verification requirements. The two
  users are explicitly preverified; mailbox ownership remains unproven.
- Prepared [operator helper](../../scripts/operations/README.md), accepting the
  two new aliases and passwords privately. Default dry run; apply requires the
  exact typed phrase. Pins source SRV hostname from the freshly inspected Atlas
  driver template to `cluster0.lxb4kqs.mongodb.net` and database `poker_playtest`.
  Minimum access: `find` and `insert` on `user` and `account` only. Transaction
  inserts two users and two credential records; no existing-user changes, wallet
  seed, ticket/economy writes, sessions, mail, schema or deployments.
- Existing source direct access is unavailable: Atlas says current IP is not
  allowlisted, and no write-capable credential has been loaded. No new roles,
  credentials or IP entries were created. Provisioning remains **not executed**.
  The operator must supply an existing permitted connection through masked
  prompts, or separately approve narrowly scoped, short-lived access first.
- Local failing-first rehearsal was observed, then passed against a generated
  loopback replica database and the actual pinned auth handler. Exact two-account
  creation, sign-in, zero wallet after normal initialization, duplicate refusal,
  full rollback on credential-insert validation failure and unchanged unrelated
  progression passed. No fixture URI/environment can redirect this test to Atlas.
- Independent code review found one Important issue: permissive email validation
  could create unusable logins. Regression failed before the fix; the helper now
  uses pinned server `z.email()`, matching sign-in. Focused helper suite passes
  2/2 after the fix. Full `pnpm check` passed 533 tests, typechecks and all configured
  production builds; final guard checks are rerun separately. PowerShell wrapper
  syntax passed; interactive private prompts have not been exercised live.
- Deferred review minors: wrapper needs PowerShell 7 but lacks `#Requires`;
  test URL-path conversion does not handle checkout paths with spaces. Invoke
  `pwsh` from the current space-free checkout. No further app/Worker change.
- Review rulings: live permissions and actual hosted creation remain unverified
  (cost if wrong: operation cannot connect or targets incorrectly); pinned host
  and operator target confirmation are prerequisites. Prompt execution remains
  pending (cost if wrong: helper may fail before submission). Provisioned accounts
  cannot satisfy hosted email verification/recovery (cost if mislabeled: false
  readiness), so A1 stays pending. Full-suite output was inspected as success.
- This helper is the user's explicitly requested operational scope addition,
  rather than a speculative product-defect fix. It is included in PR #34 for
  review. All personal accounts/progression remain preserved.
- Proposed access package, **not applied**: custom role
  `playtestAccountProvisioner20261018`, only `find` and `insert` on
  `poker_playtest.user` and `poker_playtest.account`; no wildcard namespaces or
  inherited roles. Form is prepared and unsubmitted. Then a temporary user
  `poker_provisioner_20261018`, six-hour expiry, that role only, Cluster0 only,
  with password entered/submitted by the operator. Add only this computer's
  current public IP as a temporary six-hour /32 entry, leaving existing entries
  unchanged. These security-access changes need action-time approval; do not
  choose the UI's broader readWrite role or an unrestricted IP range.
- This replaces the original read-only-only access boundary solely for creating
  the requested new pair. No provider release flags, runtime credentials,
  deployments or other database privileges are included. After the operation,
  confirm expiry/cleanup and leave the unassigned custom role for operator cleanup
  if it cannot be safely removed in the attended window. Atlas supports scoped
  [custom actions](https://www.mongodb.com/docs/atlas/security-add-mongodb-roles/)
  and [temporary cluster-restricted users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/).

## Package A approval and registration handoff — 11:30–11:33 Bangkok

- User explicitly approved Package A, then requested **new** A/B accounts instead
  of using personal accounts, and chose two `+` aliases of their own inbox. This
  later instruction supersedes the earlier existing-A/B preference; do not reuse,
  delete or reset personal accounts. Registration/verification remain inside the
  approved six-message-per-account ceiling; no ticket seeding or provider change.
- Clean task branch/usage/fetch rechecked; saved commit `7c512002`; current
  `origin/dev` remains `fe654481`, included. Usage at resumption: five-hour 63%,
  weekly 94% remaining, with the same reset times recorded in the checkpoint.
- Chrome and in-app browser had distinct existing personal sessions, displaying
  19 and 7 tickets respectively. These are **not** test-account baselines. Signed
  out both through the ordinary app UI; both displayed Sign in afterward. No
  personal progression was changed. The operator's other tabs in those browser
  cookie jars may also require sign-in again.
- Prepared distinct registration forms: Chrome `Playtest A`, in-app browser
  `Playtest B`. Names filled only; email aliases, password and registration code
  left to the operator. New password entry/confirmation/submission belongs to
  the operator; do not capture filled forms or ask for credentials in chat.
- Compared the individually revealed Render sender address with Brevo's verified
  entry privately: exact match. Re-masked it afterward; no secret/API key read.
- At handoff, neither registration had been submitted by the agent and no mail
  send was observed. Operator was instructed to submit each once, stop at the
  verification-code screen and reply “Both submitted.” Count actual sends after
  observation; do not treat the old personal sessions as A/B verification evidence.
- Next: inspect the two resulting forms without exposing credentials, corroborate
  creation/zero-balance/ownership baselines and mail delivery within the approved
  scope, then perform bounded verification/recovery. No further Package A approval
  is needed; only missing credential entry is handed to the operator.

## Authority and execution ledger

- User approved [the implementation plan](../superpowers/plans/2026-10-18-friends-playtest-readiness.md)
  with “ok fine , let do it”. Later confirmed existing A/B accounts and an attended
  window now. This identifies availability; it does not approve unpresented live actions.
- Resume the existing branch `codex/friends-playtest-spec`, draft
  [PR #34](https://github.com/24-HUB/poker-game/pull/34), base `dev`, prior commit
  `5af38bf6`. Clean start, account usage and origin fetch were checked.
- Task 1: in progress. Tasks 2–5: not started; Task 6: no reproduced product defect.
- Pre-flight: Task 1 produces the exact-candidate/private-baseline/action package
  consumed by Tasks 2–5; Task 3 produces the progression/receipt baseline for
  Task 4; Task 4 produces recovery/exit evidence for Task 5. No interface conflict.
- Ruling: retain this release record and existing checkpoints as the execution
  ledger rather than create another checkpoint file. These are acceptance and
  preparation tasks, so do not fabricate a failing product test or speculative fix.
  Cost if wrong: an omitted preparation prerequisite; explicit gates below remain open.
- Ruling: the currently observed Worker build-disable setting supersedes historical
  enabled-build evidence. Leave it disabled and propose restoration to the newly
  observed baseline, unless the operator separately requests a change. Cost if
  wrong: automatic frontend updates remain paused; no hidden redeploy is introduced.

## Fresh inventory — 11:14–11:20 Bangkok

| Item | Observed evidence | Interpretation / next action |
| --- | --- | --- |
| Merged candidate | `fe654481d97eec09d9c999f4df1a7d216a4954f0`, current fetched `origin/dev` | This planning branch contains it; PR head is a separate documentation revision. |
| Exact candidate CI | [Run 39038784692](https://github.com/24-HUB/poker-game/actions/runs/39038784692), [verify job](https://github.com/24-HUB/poker-game/actions/runs/39038784692/job/117413867874), completed/success; every step inspected | Frozen install, backend build, disposable DB initialization, migration replay, `pnpm check`, isolated backup rehearsal, Linux Worker build and Chromium acceptance all succeeded on this SHA. This is rechecked CI, not newly executed hosted acceptance. |
| Compatibility | `git diff 0d4ae28a..origin/dev` changes only six Markdown files: checkpoints, deployment/operations/checklist and maintenance record | Application, contracts, dependencies, CI and deployment configuration inputs are unchanged. Current backend is compatible with the retained Worker binary; no deployment required for these documentation changes. |
| Render | Service `srv-db6dl0ss728c7384lhq0`, `poker-anime-gacha-server`, Free Node, Singapore; Live `dep-db9o2roae00c7391eh10` on `fe654481`, auto-deploy after PR #33 | This is newer than the historical maintenance exit. Keep the same SHA for any approved configuration deployment. |
| Render controls | Saved `ALLOW_NEW_SESSIONS=true`, `ECONOMY_WRITES_ENABLED=false`, database `poker_playtest`; values read individually then re-masked | No secrets revealed. Running behavioral controls still require the approved account flow; saved-value observation alone is not end-to-end gate evidence. |
| Render updates | Auto-Deploy `After CI Checks Pass`; Blueprint `exs-db6ddjnlot8c739prvmg`, Auto Sync `Yes`, branch `dev`, `render.yaml` | Pause both only during an approved controlled window; restore these exact settings afterward. |
| Render quota | Workspace 12.6 / 750 free hours, 35 MB / 5 GB bandwidth, 10 pipeline minutes used | Workspace-wide usage, not poker-only. Pipeline allowance/headroom was not established from the inspected subset; do not infer unlimited builds or purchase capacity. |
| Worker | `poker-game`; public origin `https://poker-game.nearyou1474.workers.dev`; active configuration `e4cfba62-ffca-4f1e-9864-eda43f85f3a0`, Ready, 100% | Same secret-update version as maintenance exit; dashboard lists underlying binary `483fb438`, build `4b0e6b51-8e3a-4634-96b9-4aad4329c316`, source `0d4ae28a`. Full IDs retain their previously verified provenance; fresh dashboard corroborated displayed version prefixes and build link. |
| Worker bindings | `PROXY_SECRET` is Secret / Value encrypted; public/backend origins match expected resources; no cron, queue consumers or email routing | Do not rotate/reveal the existing secret. Logs/traces disabled. |
| Worker builds | Git-linked repository, production branch `dev`, **Disable builds on** | Drift from historical “enabled”; no setting changed. Current baseline for later restoration is disabled. |
| Brevo | Existing sender Verified; default DKIM and freemail-domain warning; 300 / 300 daily messages left | Sender verification and quota are observed; inbox delivery is untested. Keep sender address/private account details out of Git. Stop on delivery or provider rejection; do not alter sender/domain. |
| Atlas | Operator completed sign-in; project `poker_g`, `Cluster0`; 143.8 / 512 MB; `poker_playtest` 25 collections, 47 indexes | Current IP is not allowlisted for direct database connections. Do not add network access or reuse expired maintenance credentials. Metadata is readable in Data Explorer. |
| Activity | Data Explorer collection statistics: `activeParticipants=0`, `activeRoomMemberships=0`, one authority lease row | Point-in-time collection statistics only; recheck freshly before each deployment, and inspect authoritative scoped data in the approved baseline. One row alone does not prove a live lease. |
| Persisted counts | Four users/accounts, three wallets, 22 ledger rows, 28 reward receipts, 15 hands, five sessions, one banner; zero pull receipts/owned cosmetics/banner progress/equipment; migration IDs 1–7 directly observed | Matches historical durable counts, but is not a snapshot fingerprint/economy audit or validator comparison. A/B identity, verification and per-account progression are still unconfirmed privately. |
| Recovery copy | Existing encrypted archive under `D:\PokerBackups\archives`, 13,484 bytes; SHA-256 `f73726109ade7bbbbb2d9387e7eb20b8b2e7642cb329a81a823e3ddf6fb757aa`; retained key file exists | Fresh file/checksum check only. No decryption or source backup executed. Historical restore passed; archive predates migrations 006–007 and later acceptance, and has no pull/equipment content. |

Provider constraints rechecked against official docs on 2026-10-18:
[Render Free](https://render.com/docs/free) sleeps after 15 minutes without inbound
HTTP/WebSocket traffic and shares 750 monthly hours per workspace;
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
list 100,000 daily requests and 10 ms CPU for Free; [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
lists 300 daily sends. These are limits, not measured remaining quotas or a readiness pass.

No safe rollback pair is certified for current schema/data. Prefer an approved
same-SHA configuration restoration or reviewed forward fix. Do not roll back the
Worker secret configuration or restore older progression to recover an app deployment.

## Preparation checks actually run

- Node `v22.16.0`, pinned pnpm `10.33.0`; `pnpm install --frozen-lockfile` passed.
  Unprivileged pnpm initially could not acquire its local store lock and reported
  another version; the approved command used the exact pinned runtime successfully.
- Local Docker 28.3.3; started the repository's MongoDB/standalone services and
  `pnpm db:init` passed. No running containers were present beforehand; existing
  volumes were preserved. No hosted DB variables or credentials were used.
- `CI=true pnpm --filter @poker/web exec playwright test collection.spec.ts --project=chromium`
  passed **1/1, 56.7 seconds**, using the existing unique loopback fixture DB and
  in-memory mail. The fixture commits a POST through `route.fetch()`, withholds
  delivery, reloads, then recovers the original receipt and checks one debit,
  ownership/equipment at the next hand and sign-in persistence. No hosted pass.
- Restored the task-generated `next-env.d.ts` development-route imports to their
  original tracked values; no application change is retained.
- One public `pnpm smoke:deployment` passed: shell **200**, readiness **ready**.
  This ordinary read may wake the backend; it supplies no natural-sleep proof.
  Do not run probes during the later natural-idle observation.

The local interception method is verified, but the available browser-control
surface has no documented response-routing API. **Do not point the fixture suite
at hosted resources or use an unsupported browser bypass.** The hosted uncertain
response check remains blocked until an operator-reviewed equivalent is available.

## Concrete execution package — proposed, not approved

Targets are only the public Worker above, Render service/Blueprint above, existing
`poker_g / Cluster0 / poker_playtest`, existing Brevo sender and new operator-owned
A/B using two inbox aliases, per the later user instruction above.
Operator is the user; attended window requested now on 2026-10-18. Reconfirm the
window and no unrelated play immediately before any disruptive action.

### Package A: account baseline and lifecycle; no deployment

1. Privately identify new A/B and inbox ownership; record alias mapping
   outside Git. Use isolated browser sessions (Chrome A and a separate in-app
   browser B, subject to operator confirmation); never use two ordinary tabs in
   the same cookie jar as evidence of account isolation. The operator enters
   passwords/codes privately. New password entry, confirmation and submission
   during reset belong to the operator.
2. Obtain explicit read-only scope for `poker_playtest`: A/B account identity and
   verification status, wallet/daily earnings, owned cosmetics/equipment, reward
   and pull receipts, non-private hand settlement fields, catalogue/schema and
   active membership/authority metadata. Exclude password hashes, raw sessions,
   live private cards and challenge digests/codes from evidence/output. Prefer
   existing permitted read access; do not create credentials/roles or widen the
   IP list under this package. If a scoped read-only audit connection is not
   available, retain its blocked status and prepare separate access approval.
3. Record per-account starting balance, allowance and UTC date; no seed/reset.
   Verify the configured Brevo sender matches the observed verified sender
   privately before sending. Stop on mismatched inbox, sender, target or quota.
4. Account actions: the explicitly requested new A/B registration/verification,
   sign-in/out/reload, A/B browser switch, bounded recovery and
   old-password/HTTP/socket revocation checks. Expected mutations are ordinary
   sessions, code/rate records, verification only if needed and one intended
   password reset per account. Account identity/progression must remain intact.
5. Maximum **six sends per account, twelve total**, verification/password-reset
   only. Existing verified accounts omit verification only with matching evidence;
   otherwise A1 verification remains pending, never unverify/delete them. Send
   one recovery code and wait over its real ten-minute TTL to check expiry;
   issue another, wait at least the sixty-second cooldown, resend once, reject
   the superseded code, accept the newest, then reject reuse. This needs three
   reset sends/account, with the fourth reserved for one justified delivery retry
   within the approved ceiling. Wrong-code checks must stay below five failures
   per challenge; no aggressive rate-limit exercise. Stop on delivery/quota failure.
6. Compare A/B progression to baseline after reset/sign-in. Record only aliases,
   deltas, status and sanitized evidence references. End with no test room active;
   provider flags/automatic settings unchanged. Failure preserves evidence and
   stops the affected flow; never repair or recreate an account.

**Approved:** Package A's named read-only baseline and ordinary A/B account/mail
actions; later explicit user request adds new alias-account creation, with operator
credential entry. No provider changes,
deployment, game/economy action or new database/network access is included.
Identity mapping/access and credential entry remain prerequisites; approval is recorded.

### Package B: gameplay/economy and controlled restarts — prepare next

Named target: the same Render service on `fe654481`, paired with the unchanged
Worker binary/configuration above. Proposed sequence: fresh active-membership
check; drain; Render auto-deploy Off / Blueprint sync No (Worker stays disabled);
save/deploy admission true/economy true on the same SHA; record deployment ID and
smoke/account checks; A/B human-only play and earned progression; separate practice
check; attended unfinished-hand and confirmed-settlement restart drills; drain;
save/deploy original admission true/economy false; restore Render After CI Checks
Pass / Blueprint Yes and leave Worker Disable builds on; read-back/smoke/audit.
Each future deployment ID is recorded after execution; never substitute another SHA.

Stop before configuration changes if any unrelated participant appears, candidate
or controls drift, CI/access is unavailable, or integrity is uncertain. A deployment
aborts live sessions, so only the separately named mid-hand drill may interrupt
test play. All game/reward/pull effects persist; daily cap stays 20, single pull 5.
G3 response-loss, scoped economy audit and post-play backup still need resolved
methods/access. This sequence is **not submitted as executable approval yet**;
finish Package A prerequisites and those method reviews first.

### Remaining drill/recovery prerequisites

- Natural-idle check: no tabs/sockets/probes for at least the documented fifteen
  minutes, provider sleep confirmation, first-visit timing and 90-second recovery
  bound. Current smoke did not perform this check.
- Database outage: no scoped non-destructive hosted fault method approved.
  Do not pause shared Atlas, revoke shared credentials or change its network list.
- Authority overlap: ordinary same-SHA deployment is available, but a controlled
  overlapping-authority failure method has not been established on Render Free.
  Do not create paid/extra services. Restart alone cannot prove that gate.
- Recovery: separately approve a consistent post-progression source dump after
  full writer shutdown using [operations](../operations.md), retained encrypted
  stream to D: and isolated restore. Private restore app arrangement still needs
  validated no-source/no-provider/no-mail egress plus fresh local secrets and
  backed-up A/B password sign-in. Existing read-only network-none audit container
  proves metadata/economy, not a browser app's isolation. No source restore allowed.
- Friends: six actual humans, at least one phone and desktop, attendance/consent
  and operator-led invitation still pending. Do not substitute bots/fixture clients.

## Acceptance gate register

| Gate | State | Current blocker / exact next action | Owner |
| --- | --- | --- | --- |
| P1 | blocked | Package A approved; finish private new-A/B mapping/baseline and retain downstream method blockers. Inventory above is partial evidence only. | User + agent |
| A1 | blocked | User switched to direct preverified provisioning; source access pending. Mail ownership/verification cannot pass from this method; retain separate acceptance. | User + agent |
| G1 | not run | Complete A1 and approve Package B; two-human/privacy/transport observations pending. | User + agent |
| G2 | not run | Legitimate reward/cap/practice play, allowance baseline and scoped receipt audit pending. | User + agent |
| G3 | blocked | Hosted response-loss method, audit access and earned A/B pull/equip loops pending. Local 1/1 is supporting evidence only. | User + agent |
| R1 | not run | Schedule unprobed idle observation and transient reconnect test. | User + agent |
| R2 | blocked | Approve restarts and establish controlled hosted overlap/fencing method. | User + agent |
| R3 | blocked | Establish safe scoped hosted DB fault/restoration method. | User + agent |
| R4 | blocked | Content-sufficient approved recovery point, isolated browser/app method and access. | User + agent |
| F1 | not run | Prior gates, six humans/devices and attended friends window. | User |
| X1 | not run | Live window not started; final read-back/audit/post-session backup awaits that window. | User + agent |

No blocking product defect has yet been observed. A blocked prerequisite is not
a product failure or a pass. Friends readiness and production launch are not claimed.

## Approval-review interruption

Automatic browser approval review rejected initiating MongoDB's Google sign-in:
dashboard inspection did not authorize a separate Google-account authentication.
No bypass was attempted. The operator subsequently signed in and the existing
Atlas tab was reclaimed; read-only collection metadata inspection then succeeded.
This blocker is resolved; no authentication or network setting was changed by the agent.
