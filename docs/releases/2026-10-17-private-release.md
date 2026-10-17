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

Published draft [PR #33](https://github.com/24-HUB/poker-game/pull/33), base `dev`,
initial commit `40d9f7a2`; user merges manually.

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
| Database target | Render database `poker_playtest` and sanitized URI hostname match Atlas project `poker_g` / `Cluster0`, confirmed 12:34 Bangkok; metadata below | Progression classification and separate isolated restore target |
| Email | Render has `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` configured by name | Verified sender status and designated-account delivery; presence is not delivery evidence |
| Recovery | Operator selected internal `D:\PokerBackups`, about 104 GiB free, no paid storage; retained key separate in private Windows profile folder; synthetic age test passed | Offline key retrieval, encrypted staging and verified full-writer shutdown; hosted restore still pending |

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

After the user signed in, Atlas project `poker_g`, Free `Cluster0` showed MongoDB
8.0.34, AWS Singapore, three-node replica set, backups inactive, 143.76 MB / 512 MB
data and 5 / 500 connections. Its `poker_playtest` database has 25 collections and
44 indexes; `sample_mflix` shares cluster capacity. Confirm this is the runtime
URI's cluster privately before any mutation; matching database names alone do not
establish target identity. Follow-up at 12:34 Bangkok compared only the Render
URI hostname with Atlas's driver connection template and confirmed an exact match.
The URI was re-masked; credentials were not printed, copied to Git or persisted.

Actual `schemaMigrations` documents are `_id` 1 through 5 only, dated 2026-10-12;
006–007 are absent in this inspected database. Existing email-code collections
do not prove migration 006's indexes/validators or migration history. Retained
backup, explicit target confirmation and scoped migration authority are required
before applying missing migrations or claiming hosted acceptance.

Aggregate counts show stored progression: 4 users, 3 wallets, 28 reward receipts,
22 ledger rows, 15 hands, 5 sessions; zero pull receipts/owned cosmetics. These are
dashboard observations, not an economy audit or a frozen backup manifest. Preserve
all data while its value is unknown. Account/session/hand documents were not opened.
Visible game/migration database roles include `readWriteAnyDatabase@admin`;
no dedicated dump-reader role was observed. Prepare database-scoped runtime,
migration, backup-reader and isolated restore permissions for explicit approval.

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
- [x] User completed Atlas sign-in; cluster/schema metadata and sanitized counts
  inspected read-only without opening connection strings or account documents.
- [x] Confirm Atlas/runtime hostname pairing privately (12:34 Bangkok).
- [ ] Retained hosted backup and scoped authority to apply missing migrations
  006–007. Missing schema blocks hosted acceptance.
- [ ] Operator identifies whether existing progression matters. Preserve everything
  until answered; no data deletion is proposed.
- [ ] Verify Brevo sender and account/quota headroom without sending test mail.
- [x] Operator selected `D:\PokerBackups`, accepting internal-SSD storage; private
  directory ACLs and about 104 GiB free checked. No cloud storage selected.
- [x] age v1.3.2 official download digest verified; retained key generated privately
  outside backup directories; synthetic retrieval/decrypt byte match, wrong-key
  rejection and tampered-file rejection passed at 2026-10-17 11:56 Bangkok.
- [x] Operator reports handwritten offline recovery-key copy (12:34 Bangkok).
- [ ] Verify decryption using that handwritten copy; encrypted staging/streaming
  and approved full-writer shutdown remain unverified. The original profile key
  successfully decrypts via stdin, which verifies the proposed private-entry command
  but does not verify transcription of the paper copy.
- [x] Local restore tooling available after Docker startup: engine 28.3.3;
  network-isolated `mongo:8.0.17` containers report dump/restore 100.14.0.
  `pnpm test:backup` passed 1/1 on 2026-10-17 12:35 Bangkok, including server
  dependency builds and disposable authenticated replica-set recovery. Restored
  metadata/sign-in/receipt/equipment/economy passed; 797 ms restore, 7,254 ms
  procedure and zero fixture progress lost. These are synthetic timings, not a
  hosted recovery claim; no Atlas access was used.
- [ ] Review exact deployment/backup/restore targets, commands, paired artifacts,
  window, rollback and stop conditions before requesting live-action authority.
- [ ] Tasks 3–7: scoped deployment, hosted full-flow acceptance, interruption/restore,
  private cutover and operating handoff. No hosted gate is marked complete here.

Documentation verification: full diff self-reviewed against candidate sources and
observed dashboards; whitespace and 13 relative file links passed on follow-up.
The local backup suite/builds passed as above; aggregate/browser suites were not
rerun for documentation. This partial inventory
does not meet Task 1's full completion gate and remains a draft.

Proposed next package (not approved/executed): preserve `poker_playtest`; use the
selected D: encrypted storage, prove independent offline-key access and writer
shutdown; pause provider Git updates/Blueprint sync for the agreed
window; take/verify a retained backup; apply candidate migrations twice with an
explicit privately checked target and verify rows 001–007; rotate the shared proxy
credential into a Worker Secret and matching Render value; verify paired artifacts
and restore the approved automatic-update settings. Exact staging/restore targets,
full artifact IDs, reader/migration roles and window must be filled before approval.
This preserves existing data and does not authorize deleting sample or app data.

Atlas metadata inspection and synthetic local-storage preparation are complete.
Runtime-target pairing/data classification, offline-key recovery, staging/shutdown
and live-operation authority are prerequisites, not implied by
the request to implement the plan. Continue independent documentation verification
and publish the inventory as a draft PR targeting `dev`; the user merges manually.
