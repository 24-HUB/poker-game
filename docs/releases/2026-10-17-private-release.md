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
| Public Worker | Existing `poker-game`; public origin `https://poker-game.nearyou1474.workers.dev`; version `483fb438-be71-4020-81ea-497013ebf36f`, 100% traffic, source candidate `0d4ae28a`; build `4b0e6b51-8e3a-4634-96b9-4aad4329c316`; rechecked 13:29 Bangkok | Record replacement configuration-version ID after approved secret rotation |
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

## Scoped maintenance package — operator authorized; credential handoff pending

Prepared 2026-10-17 after the operator reported successful recovery with the
handwritten key. On resumption at 19:49 Bangkok the operator explicitly approved
the attended package: “yes run it now”. No live mutation has occurred yet; the
operator has created the temporary reader, with `read@poker_playtest`, a six-hour
expiry and the prepared Cluster0 restriction verified. The migrator form is ready
for human password entry/submission with the specified two database-scoped roles.
The private-profile `Save-ReleaseCredentials-20261017.ps1` helper uses masked
secure prompts and DPAPI-protected credential files outside Git. Its syntax and
current-user/SYSTEM directory ACL were checked; passwords have not yet been loaded.
It repairs the already deployed playtest candidate; it does not launch production
or authorize invitations, email sends, gameplay fixtures, data deletion or paid services.

### Targets, artifacts and data policy

- Source: existing Atlas project `poker_g`, `Cluster0`, **`poker_playtest` only**.
  Runtime/Atlas hostname pairing is verified. Preserve every account, ticket,
  receipt, cosmetic and completed hand; do not reset or import fixture balances.
- Backend: existing Render `poker-anime-gacha-server`, service
  `srv-db6dl0ss728c7384lhq0`, deployment `dep-db9eandg1s2s73acdu7g`, SHA
  `0d4ae28a9c404de8d7d9db089543a60e1fe18673`.
- Frontend: existing Cloudflare `poker-game` at
  `https://poker-game.nearyou1474.workers.dev`, Worker version
  `483fb438-be71-4020-81ea-497013ebf36f`, same SHA. Keep the binary; a secret
  configuration change may create a replacement version, which must be recorded.
  No `wrangler deploy`, Worker rename, branch merge or unrelated service change.
- Destination: age-encrypted archives and private encrypted manifests under
  `D:\PokerBackups`; use the tested direct native streams, with no plaintext dump
  on unverified NTFS staging. The operator accepted internal-SSD storage.
- Restore: a **new empty local** authenticated replica set/database
  `poker_restore_20261017`, in a dedicated disposable Docker container
  `poker-release-restore-20261017`, separate from every existing container/database.
  Refuse an existing name/nonempty target. Keep restored data on tmpfs with Docker
  `--network none` and **no published ports**, production credentials or email
  configuration. A companion `node:22.16.0-bookworm-slim` audit container joins
  `--network container:poker-release-restore-20261017`; its `127.0.0.1:27020`
  endpoint is internal to that namespace, not exposed on the host. Mount only the
  prepared unchanged verifier/contracts bundle read-only from
  `D:\PokerBackups\tools\restore-audit-c0acb8fe-v2`. Validate no default route or
  source secrets before passing it live data. Do not start the app or send notifications.
  Use separate generated local restore-writer/reader credentials and unchanged
  `scripts/verify-economy.mjs` against the explicit local reader target.
- Isolation preflight: an internal-network/host-port approach failed its local
  connection check and is excluded. The network-none MongoDB plus companion Node
  approach passed against an authenticated disposable replica: original verifier
  succeeded, read-only writes were denied, zero ports/default route. Initial audit
  packaging encountered a type-only package with no JavaScript entry; resolving
  its manifest fixed the copy. The v2 bundle contains 13 existing dependencies,
  copied contracts and the byte-identical verifier; no `.env` or application source
  changed. This is local synthetic readiness evidence, not hosted recovery.
- Operator window: start only after the user approves **now** and confirms nobody
  is playing or changing this database from another client. This is one attended
  maintenance window, not permission for later outages. No fixed duration is promised;
  report failures and leave a recorded safe state rather than bypassing checks.

### Access and credential handoffs

Request narrowly scoped Atlas temporary users (6-hour expiry, `Cluster0` only):
`poker_release_reader_20261017` with `read` on `poker_playtest`, and
`poker_release_migrator_20261017` with `readWrite` plus `dbAdmin` on that database.
The [Atlas procedure](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
supports six-hour temporary users and cluster restrictions. No `readWriteAnyDatabase`,
new admin, runtime-role expansion or unrestricted network rule is authorized.
If current network access is insufficient, stop and prepare a separate exact rule.

The human operator enters/submits new database passwords and the replacement
proxy credential privately when prompted. Keep necessary operator configuration
DPAPI-protected in a private profile directory; pass tool config through private
container tmpfs/stdin. No secrets in arguments, shell history, Git, screenshots or
chat. Reader credentials go only to the source dump/audit; migration credentials
only to the two approved migration runs; neither goes into the restore environment.

### Approved action sequence if the operator accepts this package

1. Recheck exact targets/SHAs, required green candidate CI and original provider
   controls. Record them. Pause Render Auto-Deploy and Blueprint Auto Sync plus
   Cloudflare Git builds. Original states are After CI Checks Pass / Yes / enabled.
   Do not merge or sync repository changes during this window.
2. Confirm no active play; let the host end any session and wait for committed
   settlement. Close both admission/economy controls through a controlled restart,
   then suspend the **named Render service**. Verify suspension, no running jobs,
   migrations, catalogue publishers or manual clients, and no traffic-driven wake.
   Flags alone are not quiescence. If every writer cannot be accounted for, stop
   before dumping and report the unresolved writer.
3. With the reader, capture schema rows, catalogue hash, all collection options,
   validators/indexes/counts and read-only economy results in the private manifest.
   MongoDB TTL deletion can continue after app shutdown: compare complete metadata
   and counts before/after capture, and unchanged progression fingerprints. If
   they differ, do not certify that attempt; preserve the previous known-good
   backup and resolve/retry only within this approved window. Never disable TTL,
   drop indexes or repair rows as an unapproved shortcut.
4. Run Database Tools **100.14.0** in a disposable source tool container. The dump
   operation is `mongodump --config=/run/poker/reader.yml --db=poker_playtest
   --archive --gzip --quiet`; the credential file stays in tmpfs. Pipe its native
   stdout to the installed age v1.3.2 with the retained recipient, writing a fresh
   timestamped provisional encrypted archive under D:. Check both exits and
   source consistency, then hash the ciphertext. Encrypt the private manifest too.
   No `--oplog`, plaintext archive, source restore, overwrite or `--drop`.
5. Retrieve that D: archive/key and stream age decryption into the isolated local
   restore with `mongorestore --archive --gzip --stopOnError
   --nsInclude=poker_playtest.* --nsFrom=poker_playtest.*
   --nsTo=poker_restore_20261017.*`. Compare metadata/counts and run the existing
   read-only economy verifier with explicit local target and
   `ECONOMY_VERIFY_MODE=operator-read-only`. If isolation, checksum, metadata or
   economy fails, do not label the archive known-good or migrate the source.
   Restored-auth/full-flow hosted acceptance remains a later separately scoped gate.
6. Only after those checks pass, privately load the database-scoped migration URI
   and explicit `MONGODB_DATABASE=poker_playtest`. Run candidate `pnpm db:migrate`
   **twice**, checking each exit. Verify exact schema rows 001–007, migration 006's
   validators/unique and TTL indexes and migration 007's room/session/hand validators.
   Existing records are not deleted/backfilled. A duplicate/index/validation error
   is a stop condition, not authority to change or discard offending data.
7. During the same downtime, coordinate a new shared `PROXY_SECRET`: the operator
   enters it in Render and in Cloudflare as a **Secret**, replacing the plaintext
   Variable. Keep `PUBLIC_ORIGIN`, fixed `BACKEND_ORIGIN` and auth secret unchanged.
   Record the replacement Worker configuration version. Never log the value or
   restore the exposed prior credential during fallback.
8. Resume the same backend SHA with both controls false. Verify deploy health,
   single ready authority, schema and unchanged durable progression; through the
   public origin run the bounded `pnpm smoke:deployment` with the approved origin.
   Smoke success is not full hosted acceptance. Then restore original admission
   **true**, economy **false**, and the original provider automatic-update settings
   through controlled operations; record exact versions/settings and results.

### Failure and rollback limits

Before source migrations, a failed backup can return to the original compatible
candidate/settings after resolving any uncertain transactions; record that no new
known-good backup was accepted. After partial schema work or credential mismatch,
keep admission/economy closed and automatic updates paused while preparing a
forward fix. Do not down-migrate, switch to pre-006/pre-bot binaries, restore over
the source, delete data, re-enable purchases, buy capacity or claim release success.
Data restoration onto Atlas and any accepted loss window need separate incident
authorization. Leave temporary users to their selected expiry; any further access
or cleanup action must stay within its explicit approval scope.

Exit: retained verified recovery point, source schema 001–007, paired credentials
and the original usable private-game settings, with all actual evidence recorded.
Production cutover, hosted account/email/game/economy and interruption acceptance,
runtime-role hardening and the final private-release decision remain open.

## Gates and exact next actions

- [x] Clean branch setup, usage check, fetch, repository/configuration inspection.
- [x] Exact merged-candidate CI and observed live Render SHA identified.
- [x] Runbook admission/economy drift and schema manifest corrected.
- [x] Confirm active Worker version prefix/source and effective public/backend origins.
- [x] Capture full Worker version ID. Maintenance uses existing dashboard resource
  `poker-game` and its current binary; no manual Wrangler upload or name change.
  Wrangler's differing default name remains a future operator-upload prerequisite.
- [ ] Execute approved coordinated proxy credential rotation; never restore the
  previously exposed value as a rollback.
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
- [x] Operator reports the masked handwritten-key sample decrypt succeeded
  (13:26 Bangkok); the key was not sent through chat.
- [x] Direct dump→age→retained D: archive→age→restore roundtrip passed on a
  network-disabled disposable two-record MongoDB fixture (13:28 Bangkok):
  documents, indexes and validators matched, both process exits checked, no
  plaintext disk archive. This is not a hosted or authenticated recovery claim.
- [ ] Prove full-writer shutdown and consistent source capture during the approved
  window; live backup/restore and schema application remain unexecuted.
- [x] Local restore tooling available after Docker startup: engine 28.3.3;
  network-isolated `mongo:8.0.17` containers report dump/restore 100.14.0.
  `pnpm test:backup` passed 1/1 on 2026-10-17 12:35 Bangkok, including server
  dependency builds and disposable authenticated replica-set recovery. Restored
  metadata/sign-in/receipt/equipment/economy passed; 797 ms restore, 7,254 ms
  procedure and zero fixture progress lost. These are synthetic timings, not a
  hosted recovery claim; no Atlas access was used.
- [x] Prepare/self-review exact maintenance targets, commands, paired artifacts,
  window, rollback and stop conditions in the scoped package above.
- [ ] Operator approves that package and confirms the attended no-active-players
  window before any source dump, provider change, access creation or migration.
- [ ] Tasks 3–7: scoped deployment, hosted full-flow acceptance, interruption/restore,
  private cutover and operating handoff. No hosted gate is marked complete here.

Documentation verification: full diff self-reviewed against candidate sources and
observed dashboards; whitespace and 13 relative file links passed on follow-up.
The local backup suite/builds passed as above; aggregate/browser suites were not
rerun for documentation. This partial inventory
does not meet Task 1's full completion gate and remains a draft.

The concrete maintenance package above supersedes the earlier placeholder. Runtime
pairing, full artifact identity, operator-reported handwritten-key recovery, stream
transport and isolated local audit readiness are now recorded. Live shutdown proof,
consistent hosted capture/restore, temporary access/credential handoffs and explicit
authorization for the attended window remain gates. Preservation is the default;
no source/sample data deletion is proposed. PR #33 stays draft and the user merges
manually. A maintenance success will still leave hosted full-flow acceptance and
the private-release decision open.
