# Private release execution record — 2026-10-17

Status: inventory in progress; hosted acceptance and private launch remain blocked.
This implements Task 1 of the plan in [PR #32](https://github.com/24-HUB/poker-game/pull/32).
The plan PR was still open at inspection. This new execution task branches from
fresh `origin/dev`; it neither merges that PR nor copies its planning checkpoint.

## Execution and candidate

- Branch: `codex/hosted-release-inventory`, starting at clean fetched
  `0d4ae28a9c404de8d7d9db089543a60e1fe18673` (`origin/dev`).
- Method: inline execution, as the plan requests. The existing `CHECKPOINT.md`
  and `plan.md` section 18 retain progress; this record holds inventory/evidence.
- Ruling: preserve all hosted progression while its value/classification is unknown.
  No fixture stack, migration, backup, outage, email or deployment is authorized
  by inventory alone. Calling a database playtest does not make its contents disposable.
- [Candidate CI run #111](https://github.com/24-HUB/poker-game/actions/runs/38996688408)
  targets this exact SHA on `dev`; inspected success, 9m 5s total.
  [Required verify job](https://github.com/24-HUB/poker-game/actions/runs/38996688408/job/117290696108)
  succeeded in 9m 2s. Its steps include frozen install, uncached backend build,
  disposable replica initialization, migration replay, `pnpm check`, encrypted
  isolated backup/restore, Linux Worker packaging and full Chromium acceptance.
  This is rechecked CI evidence, not a new local suite or hosted test.
- CI annotations: action runtime deprecation and upcoming `ubuntu-latest` image
  transition. The job passed; no unrelated dependency/workflow upgrades are included.

## Existing resources

Read-only dashboard inspection on 2026-10-17. Do not copy private manifests,
credentials, personal addresses, account/session IDs or private-card captures here.

| Resource | Observed state | Still required |
| --- | --- | --- |
| Public Worker | Existing `poker-game`; public origin `https://poker-game.nearyou1474.workers.dev`; active version displayed as `483fb438`, 100% traffic, source candidate `0d4ae28a`; build `4b0e6b51-8e3a-4634-96b9-4aad4329c316` | Capture full immutable version ID before any release/rollback |
| Worker configuration | `BACKEND_ORIGIN` is the Render origin above; `PUBLIC_ORIGIN` matches public Worker origin; `PROXY_SECRET` exists as a plaintext Variable | Coordinated credential rotation into a Cloudflare Secret and matching Render value before acceptance |
| Worker builds | Git-linked `24-HUB/poker-game`, production branch `dev`, builds enabled, watch paths `*`; existing build/deploy commands use frozen pnpm and Wrangler | Include Worker build trigger in coordinated pause/resume package; repository has no deploy workflow but provider-native builds exist |
| Repository Worker config | `apps/web/wrangler.jsonc` names `poker-anime-gacha-web`, `keep_vars: true` | Resolve name mismatch with actual `poker-game` before any upload; do not accidentally create another Worker |
| Render | `poker-anime-gacha-server`, Free Node, Singapore, `dev`; [service](https://dashboard.render.com/web/srv-db6dl0ss728c7384lhq0) | Current traffic/active-game classification and resource/quota review |
| Live backend | `0d4ae28a9c404de8d7d9db089543a60e1fe18673`; [deployment](https://dashboard.render.com/web/srv-db6dl0ss728c7384lhq0/deploys/dep-db9eandg1s2s73acdu7g); origin `https://poker-anime-gacha-server.onrender.com` | Public-origin acceptance and full immutable Worker ID |
| Render build/start | Frozen pnpm 10.33.0 install and `pnpm build:server`; `pnpm --filter @poker/server start`; health `/health/deploy` | No change required from inventory |
| Render automatic updates | Auto-Deploy **After CI Checks Pass**; [Blueprint](https://dashboard.render.com/blueprint/exs-db6ddjnlot8c739prvmg/settings) `poker-anime-gacha` Auto Sync **Yes**, `dev`, `render.yaml` | Scoped authority to pause/resume both for coordinated maintenance |
| Live flags | `ALLOW_NEW_SESSIONS=true`, `ECONOMY_WRITES_ENABLED=false`; matches blueprint | Controlled restart/window approval before changing either |
| Database target | Render `MONGODB_DATABASE=poker_playtest`; URI remains masked | Atlas sign-in, cluster identity, actual versions/counts, accounts/progression classification, separate isolated restore target |
| Email | Render has `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` configured by name | Verified sender status and designated-account delivery; presence is not delivery evidence |
| Recovery | Operator/retention/recovery targets already approved in [operations](../operations.md) | Destination/capacity, independently recoverable key and verified full-writer shutdown |

Render also lists another active service. Its purpose and shared allowance impact
are unverified; do not modify it or assume the workspace quota is exclusive to poker.
Free-service Maintenance Mode is unavailable. A Suspend Web Service control exists,
but no suspension was performed and its sufficiency for this backup has not been proven.

Inspected Render configuration names: `ALLOW_NEW_SESSIONS`, `BETTER_AUTH_SECRET`,
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`,
`ECONOMY_WRITES_ENABLED`, `MONGODB_DATABASE`, `MONGODB_URI`, `NODE_ENV`,
`NODE_VERSION`, `PROXY_SECRET`, `PUBLIC_ORIGIN`, `REGISTRATION_INVITE_CODE_SHA256`.
Only non-secret Render flags/database/public origin were explicitly revealed for
inventory, then masked again. The Cloudflare settings page unexpectedly displays
`PROXY_SECRET` as plaintext because it is configured as a Variable. Do not copy its
value into Git or evidence; treat it as exposed and require coordinated rotation
into a secret binding on Worker and the matching Render credential. No rotation
or provider setting change was performed during inventory.

## Schema and rollback compatibility

Candidate registry `apps/server/src/database/migrate.ts` contains 001 foundation,
002 room commands, 003 poker, 004 tickets, 005 collection, 006 email codes and
007 bot players. A live manifest must record actual applied rows as well as the
candidate registry; do not infer Atlas migration success from backend deployment.
The CLI defaults to database `poker` if `MONGODB_DATABASE` is absent: verify an
explicit approved URI/database privately before any authorized migration.

No compatible rollback pair is selected. Render retains earlier successful
deployments, including `17a43ba5` from before bot players; availability of a rollback
button does not establish compatibility with migration 007 or practice records.
Pre-006 email-link artifacts are unsafe for current account recovery. Until both
schema/data and paired Worker compatibility are proven, use authorized maintenance
and a forward fix rather than assuming an older binary is safe. Never restore
older progression merely to roll back application code.

## Gates and exact next actions

- [x] Clean branch setup, usage check, fetch, repository/configuration inspection.
- [x] Exact merged-candidate CI and observed live Render SHA identified.
- [x] Runbook admission/economy drift and schema manifest corrected.
- [x] Confirm active Worker version prefix/source and effective public/backend origins.
- [ ] Capture full Worker version ID, reconcile its name with Wrangler and prepare
  coordinated proxy credential rotation; do not redeploy a differently named Worker.
- [ ] Sign in to Atlas in the browser; inspect only cluster/schema metadata and
  sanitized counts under read-only scope. Do not expose connection strings.
- [ ] Operator identifies whether existing progression matters. Preserve everything
  until answered; no data deletion is proposed.
- [ ] Verify Brevo sender and account/quota headroom without sending test mail.
- [ ] Choose retained storage and separately recoverable key, then prepare a
  synthetic encryption/retrieval drill and approved full-writer shutdown procedure.
- [ ] Review exact deployment/backup/restore targets, commands, paired artifacts,
  window, rollback and stop conditions before requesting live-action authority.
- [ ] Tasks 3–7: scoped deployment, hosted full-flow acceptance, interruption/restore,
  private cutover and operating handoff. No hosted gate is marked complete here.

Documentation verification: full diff self-reviewed against candidate sources and
observed dashboards; whitespace and 14 relative file links passed. Application
tests were not rerun for this documentation-only change. This partial inventory
does not meet Task 1's full completion gate and remains a draft.

Atlas currently opens its login page. Resource identities/data classification,
backup/key choice and live-operation authority are prerequisites, not implied by
the request to implement the plan. Continue independent documentation verification
and publish the inventory as a draft PR targeting `dev`; the user merges manually.
