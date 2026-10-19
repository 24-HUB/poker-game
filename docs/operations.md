# Backup, restore and incident operations

Current evidence: the [October 17 maintenance record](releases/2026-10-17-private-release.md)
contains the executed hosted backup/shutdown/restore observations; the
[October 18 account record](releases/2026-10-18-friends-playtest.md) contains the
later A/B baseline. Earlier dated preparation notes below retain their historical
scope. The proposed remaining application-level restore work is specified in the
[M5 completion design](superpowers/specs/2026-10-19-m5-completion-design.md).

This runbook prepares the private release. Live backups, restores, provisioning,
secret changes and deployments still require authorization for the exact environment
and action. M5.1 admission/maintenance controls are locally implemented; M5.3 hosted
acceptance has not run. An isolated local rehearsal is evidence about test data,
not a verified Atlas recovery plan.

## Operator and approved targets

2026-10-17 attended maintenance evidence is in the
[release record](releases/2026-10-17-private-release.md#maintenance-exit--2025-bangkok).
The approved consistent Atlas dump streamed directly into age on D:, then was
retrieved/decrypted into an authenticated isolated tmpfs replica with no external
network or published ports. All 25 collections matched metadata/counts/document
fingerprints; unchanged economy audit passed. Restore verification took 5,453 ms.
Initial index-list ordering differed between Windows/Linux; compare index lists
with a stable code-point order while retaining compound-index key order. Source
migrations then passed twice and durable progression stayed unchanged. Encrypted
archive and private manifests remain retained; no plaintext archive was written.
This proves that scoped recovery copy, not restored-account/full-flow acceptance.
At 20:25 Bangkok, paired proxy rotation into an encrypted Worker Secret and matching
Render setting passed public smoke. Backend is online with original admission
true/economy false and all original automatic-update controls restored/read back.
Final schema/progression/economy and single-authority audits passed. The scoped
maintenance is complete; full hosted account/email/game/interruption acceptance
and production cutover remain open. Temporary access expires naturally.

The user is the backup/incident operator, confirmed 2026-10-07. They approved:

| Setting | Approved target |
| --- | --- |
| Cadence | After every play session and before every release/database change |
| Retention | Seven latest successful session backups, plus the latest pre-release backup until the next release is verified |
| Recovery point | At most progress since the last successful backup |
| Recovery time | Within one operator-attended day, measured from incident declaration to safe reopening |

These are operating targets, not guarantees. On 2026-10-17 the operator selected
`D:\PokerBackups` with no paid storage, explicitly accepting that D: is the internal
WD_BLACK SN770 NVMe SSD also holding the project. Inspection found about 104 GiB
free. This is a local encrypted recovery destination, not a physically independent
backup or protection against loss of that SSD/computer.

Preparation at 11:56 Bangkok created current-user/SYSTEM-only NTFS directories:
`archives`, `manifests`, `samples` and `tools`. The retained age identity is separate
in `%USERPROFILE%\.poker-backup-keys\poker-backup.agekey`, with the same private ACL.
Never copy its contents into Git, chat, email or the archive directory. The operator
must keep an independently accessible offline copy and demonstrate retrieval before
a hosted backup/release. The current profile copy alone does not satisfy that gate.
At 2026-10-17 12:34 Bangkok the operator reported a handwritten offline copy.
This is recorded as operator confirmation of retention; decryption using that
handwritten copy is still unverified. The harmless sample accepts identity input
through stdin (`age -d -i - <sample>`), so PowerShell 7 `Read-Host -MaskInput` can
test the paper copy privately without displaying it or adding it to shell history.
Never type a real key as a literal command or paste it into chat.
At 13:26 Bangkok the operator reported the masked handwritten-key test worked.
Record that as operator-reported recovery success, not an agent-observed entry.

At 13:28 Bangkok a separate network-disabled disposable MongoDB fixture on tmpfs
was dumped directly into age, retained encrypted on D:, then decrypted directly
into `mongorestore`. Both native process exit statuses were checked. Two fixture
records, validators and indexes matched after restore; no plaintext disk archive
was created. The encrypted sample/verification manifest remain under D: outside
Git. This validates the stream transport; the authenticated replica-set/application
recovery rehearsal below remains separate evidence.

Restore isolation was also checked with a network-none authenticated MongoDB
replica and a companion Node 22 container sharing its namespace: unchanged economy
verifier passed and a reader write was denied, with no published ports/default
route or production credentials. A host-port/internal-network preflight could not
connect; do not use that failed arrangement. The prepared v2 audit bundle under
`D:\PokerBackups\tools` contains only the unchanged verifier/contracts and 13
existing dependencies; its manifest records the verifier hash. Mount it read-only.

Local tooling follow-up at 12:35 Bangkok: Docker Desktop became ready (engine
28.3.3); isolated `mongo:8.0.17` containers provide dump/restore 100.14.0.
`pnpm test:backup` passed 1/1 with dependency/server builds, scoped credentials,
metadata, restored sign-in, committed receipt replay, equipment and economy checks.
Synthetic restore 797 ms, total procedure 7,254 ms, zero fixture progress lost.
This fresh local rehearsal uses its own ephemeral encryption key; it does not
verify the retained paper key, age-based hosted pipeline, or Atlas recovery.

[Official age v1.3.2](https://github.com/FiloSottile/age/releases/tag/v1.3.2) Windows
amd64 archive was downloaded and its SHA-256 checked against the official release
asset digest before execution. A harmless sample was encrypted directly from memory,
then read back from `D:\PokerBackups\samples` and decrypted with the retained key:
bytes matched, wrong-key decryption failed and a tampered archive was rejected.
The timestamped result/manifest and encrypted sample remain outside Git. No account
data or database was accessed. No plaintext sample was written to disk. The local
README describes tool/key paths and retention; this is an operator preparation,
not a new production-backup CLI or a hosted restore rehearsal.

Handwritten-key recovery is operator-reported and direct encrypted streaming is
locally verified. Provider writer shutdown and hosted dump/isolated restore remain
unverified; plaintext disk staging is not selected. Before hosted release,
record restricted references to the recipient/key, operator access and emergency
recovery procedure. Confirm capacity for retained archives and protected staging
before accepting progress. Do not provision paid storage automatically.

After a replacement backup has passed checksum, decryption and isolated restore
checks, the operator removes only backups outside retention, including staging
copies and storage trash/version history under that provider's disposal rules.
Record deletion dates; do not discard the latest known-good recovery point after
a failed backup. Rehearse recovery-key access before release.

## Read-only economy verification

Build the pinned contracts first (`pnpm --filter @poker/contracts build`), supply
an explicit URI/database using private environment configuration, then run:

```powershell
# Use a database-scoped read credential. Never echo the URI or use runtime write credentials.
$env:ECONOMY_VERIFY_MODE = 'operator-read-only'
node scripts/verify-economy.mjs
if ($LASTEXITCODE -ne 0) { throw 'Verification failed; keep affected writes closed.' }
```

`MONGODB_URI` and `MONGODB_DATABASE` are required; there is no default database.
Without explicit `operator-read-only` mode the CLI accepts only loopback MongoDB
and `poker_test_*` names. It rejects `admin`, `local` and `config` in either mode.
The mode is a target confirmation, not a permission upgrade: the database role
must enforce read-only access. Live use still requires the operator's authorization.

The verifier selects necessary economy fields and reads all documents using one
snapshot session on a replica set. It never repairs or initializes data. Migrations
must be stopped because collection metadata is read separately from the snapshot.
Output is only `ok`, collection counts and fixed mismatch categories; failures
exit nonzero without driver messages, identifiers, cards, cookies or credentials.
It checks wallet/ledger equality using integer sums, nonnegative balances, reciprocal
reward/hand and debit/pull references, daily earnings/cap, catalogue schema/hash,
pull prices/items/duplicate and pity history, acquisition sources, final banner
progress and equipment ownership/slot. Legacy hands without rewards are valid;
free default equipment is `null`, outside the pull pool. Only reward policy v1 is
supported; add audit support before introducing another policy.

Rows are held in memory for the small private dataset. Snapshot/history expiration,
malformed data or resource/time limits are verification failures, never evidence
that the economy is healthy. This audit checks stored relationships; it cannot
prove game fairness, recover missing whole histories, or prove the snapshot was
complete without independent backup/schema/count evidence. It does not audit the
SSR eligible-pool exclusion rule; that behavior remains covered by gacha tests.
Zero mismatches are
necessary but insufficient for release.

## Consistent backup procedure

Under the selected $0 setup, no managed backup subscription is selected. As
checked on 2026-10-19, Atlas now documents an
[optional billed backup subscription for Free clusters](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/).
Do not enable it or add a payment method without separate user authorization.
The manual encrypted procedure below remains the selected approach.
MongoDB supports Database Tools dumps/restores
for Free clusters; the current Free tool restrictions exclude `--oplog` and
`--oplogReplay`. Use a **quiescent database dump** without either option.
See [Atlas backup limitations](https://www.mongodb.com/docs/atlas/backup-restore-cluster/)
and [Atlas Free tool restrictions](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

1. Record authorization, source environment/database, application SHA, server/FCV
   and matching dump/restore tool versions, every schema version registered by the
   selected candidate (`apps/server/src/database/migrate.ts`, currently 001–007),
   the target's actual applied versions, catalogue version/hash,
   previous successful backup and incident loss window. Check encrypted storage/key
   access and enough space. Use an application-database-scoped reader for the dump.
2. Close new sessions and purchases. Tell friends about the planned interruption.
   Resolve in-flight settlements and unknown commits through committed receipts;
   let completed hands settle, and explicitly abort unfinished hands under the
   existing restart policy. Aborted hands earn no tickets. Do not infer settlement
   from a browser acknowledgement. Take backend instances offline, disable automatic
   restarts/deploys for the window, and wait for bounded graceful shutdown.
3. Stop **every database writer**, including auth signup/login, session refresh,
   password recovery, lease renewal, migrations, catalogue publishing and jobs.
   Prevent Worker traffic from waking the backend; all instances must be confirmed
   stopped. The startup controls in [deployment.md](deployment.md) block new
   sessions, pulls and equipment changes but do not freeze all writers.
   Where available, temporarily revoke runtime write access after
   shutdown; retain only an operator-scoped dump reader. If writers cannot be
   stopped, cancel this backup. Reopening waits until dump completion.
   For the existing Render service, both Auto-Deploy (After CI Checks Pass) and
   Blueprint Auto Sync (Yes) were enabled at inventory on 2026-10-17. An authorized
   shutdown must pause both and prevent traffic-driven wake. The Free service's
   paid Maintenance Mode is unavailable; do not substitute it for writer shutdown
   or upgrade automatically. Service suspension is exposed in its dashboard, but
   its quiescence/wake-prevention sequence was observed during the
   [October 17 maintenance](releases/2026-10-17-private-release.md). Recheck that
   sequence and actual writer shutdown in the new authorized window; historical
   evidence alone cannot authorize or certify a fresh dump. Cancel a hosted dump
   until the approved method demonstrably stops every writer. Record the
   original controls and restore them only at the approved reopening point.
4. Verify economy with the reader and record collection counts plus collection
   options/validators/indexes separately in the private backup manifest. Capture
   the quiescence time (the recovery point). Do not back up a known discrepancy
   as a new known-good backup; preserve it separately as incident evidence.
5. Use a private tool-config file containing the reader URI/password; restrict
   it with OS ACLs. Avoid credentials in command arguments, logs or shell history.
   Set `BACKUP_TOOL_CONFIG`, `BACKUP_DATABASE`, `BACKUP_DIRECTORY` and
   `BACKUP_AGE_RECIPIENT` to approved operator values. The staging directory must
   be outside the repository and service disk on an encrypted, operator-only volume.
   Run this only after the preceding gates:

   For the selected D: destination, volume encryption is unverified. Prefer the
   tested native byte-stream alternative: `mongodump --archive --gzip` stdout to
   age stdin, then age stdout to `mongorestore --archive --gzip` stdin on recovery.
   A controller must check **both** processes, cancel peers on failure and leave
   the new archive provisional until checksum, decryption, metadata/count and
   isolated restore checks pass. A shell pipeline's last exit code is insufficient.
   Keep tool credentials in private tmpfs or DPAPI-protected storage, never args.
   Do not write a plaintext dump to D: as a shortcut. The file-staging example
   below applies only to a separately verified encrypted staging volume.

   ```powershell
   $backupDatabase = $env:BACKUP_DATABASE
   $backupStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ', [Globalization.CultureInfo]::InvariantCulture)
   $backupPlain = Join-Path $env:BACKUP_DIRECTORY "$backupStamp.archive.gz"
   $backupEncrypted = "$backupPlain.age"
   mongodump --config=$env:BACKUP_TOOL_CONFIG --db=$backupDatabase --archive=$backupPlain --gzip --quiet
   if ($LASTEXITCODE -ne 0) { throw 'Dump failed; do not record success.' }
   age --recipient $env:BACKUP_AGE_RECIPIENT --output $backupEncrypted $backupPlain
   if ($LASTEXITCODE -ne 0) { throw 'Encryption failed; secure staging and investigate.' }
   Get-FileHash -LiteralPath $backupEncrypted -Algorithm SHA256
   Remove-Item -LiteralPath $backupPlain
   ```

   The single archive preserves BSON and metadata and avoids case-insensitive
   filesystem collisions. `--gzip` compresses, it does not encrypt. `age` is an
   operator-managed example; verify its official [usage/key guidance](https://github.com/FiloSottile/age)
   before installing or selecting it. The selected local age installation is
   recorded above; Database Tools currently run inside disposable local containers.
6. Keep an encrypted manifest with backup/quiescence timestamp, encrypted checksum,
   tool/runtime versions, SHA, metadata/counts and measured timings, never plaintext
   credentials. Validate authenticated decryption and perform the isolated restore
   below before marking the backup successful. Remove all plaintext staging copies,
   preserve encrypted evidence and apply retention only after validation.
7. Restore the explicitly approved runtime permissions/configuration and start
   exactly one fenced authority. Verify cleanup, readiness and account/progression
   checks before reopening traffic. Record the actual outage and new recovery point.

Use identical Database Tools versions for dump/restore and matching server major
version/FCV. Archive/metadata portability across versions must not be assumed.
[MongoDB dump compatibility](https://www.mongodb.com/docs/database-tools/mongodump/mongodump-behavior/).

## Isolated restore procedure

1. Verify checksum and recovery-key access before decrypting to private encrypted
   staging. Use a fresh, empty, **different** application database on an isolated
   authenticated replica set, with separate database-scoped restore and reader
   credentials. Refuse a nonempty target. Do not use `--drop`, restore over the
   source, or restore `admin`/`config`/`local` or live users/roles.
2. Deny outbound mail and production proxy/database access. For generated local
   accounts only, the test harness uses `NODE_ENV=test` and memory email transport;
   never deploy that configuration. Treat a live dump as sensitive auth data even
   in isolation. Do not notify real account holders during a restore test.
3. Record incident start, restore start and end. With private destination tool
   config, restore only the approved application namespace:

   ```powershell
   # Set sourceDatabase, restoreDatabase and restorePlain from the approved manifest/target.
   mongorestore --config=$env:RESTORE_TOOL_CONFIG --archive=$restorePlain --gzip --stopOnError --nsInclude="$sourceDatabase.*" --nsFrom="$sourceDatabase.*" --nsTo="$restoreDatabase.*"
   if ($LASTEXITCODE -ne 0) { throw 'Restore failed; keep target isolated.' }
   ```

   [Namespace remapping](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/)
   retains the source and restores into the new database. Database users/roles are
   managed separately; an application database dump is not a credential backup.
4. Compare **all** collection counts, validators/options and index definitions
   with the source manifest, including schema-migration history. Missing metadata
   or collections blocks recovery. Do not run migrations to hide a restore defect.
   Run the verifier using the destination reader. Then, with generated test accounts,
   verify sign-in and stable account identity, original reward/pull receipt reads
   and replay without another charge, owned items and equipment. Confirm one
   authority and restart cleanup before any hosted recovery acceptance.
5. Measure lost progression against the frozen source recovery point and recovery
   duration through safe reopening. Compare with approved targets; record limits
   and data scale. Stop and escalate if loss is unacceptable. Dispose of only the
   approved isolated target and plaintext staging after the operator records evidence.

A binary rollback preserves additive schema and already committed progression;
it does not undo rewards or charges. Restore of a live database is a separately
authorized incident decision with an explicit loss window. Never overwrite newly
earned progress automatically with the pre-release backup. For incompatible schema,
keep maintenance and prepare a forward fix. Backend and Worker rollback revisions
must be compatible and approved together; see the M6 plan.

## Incident actions

| Trigger | Containment and evidence | Recovery gate |
| --- | --- | --- |
| Account compromise | Suspend affected access using the authorized auth/operator path; revoke sessions, inspect sanitized receipt/audit history, secure the email account | Verify identity through approved recovery, rotate exposed credentials when authorized, confirm old sessions/socket access are rejected; never infer ownership from email text alone |
| Free-tier quota exhaustion | Close affected writes/traffic, record provider usage/errors and pending receipt IDs privately; stop retry storms | Resume only with measured quota headroom and correct receipts; no automatic paid upgrade or sleep-evasion pings |
| Broken deployment | Close admission/purchases; drain or explicitly abort, preserve committed receipts and candidate SHAs | Approved compatible backend/Worker rollback or forward fix, deploy/readiness and one-authority checks, verifier and bounded full-loop acceptance |
| Lost DB access | Stop commands/timers/private delivery as authority expires; preserve errors without URI/secrets | Restore authorized credentials/network access, verify schema/transactions/one authority, resolve uncertain commits before retries; never fabricate balances or logout |
| Ledger discrepancy | Stop affected economy writes, freeze writer instances if scope is uncertain, take encrypted evidence copy | Reconcile source hands/receipts/ledger in isolation, review an explicit correction plan; no blind compensating credits, deletion or automatic repair |

Record UTC times, operator, affected environment/revision, scope, sanitized symptoms,
last successful backup, quiescence/containment, loss window, exact authorized actions,
checks run and reopening decision. Keep account identifiers and raw logs in restricted
incident storage; never publish cookies, invite/reset links, credentials or private cards.

## Local rehearsal evidence — 2026-10-07

Run `pnpm test:backup` after a frozen install, with Docker available. It creates its
own authenticated loopback MongoDB 8.0.17 replica set and random source/target names;
it accepts no external URI override. Operator schema setup is separate from runtime
credentials. Generated verified auth data and synthetic completed hands use real
reward, pull and equipment repositories; no game server or background auth writer
runs. The source writer is closed and revoked before dump. Scoped readers cannot
write or read the destination, and the restore writer cannot read the source.

First successful drill at **12:31:53 UTC** (19:31:53 Bangkok): Database Tools
**100.14.0** matched. Authenticated AES-256-GCM encryption wrote the archive outside
the repository to an OS temporary directory; tampering failed authentication.
Encrypted SHA-256: `1836da4a9c6e7e3c300b515f03384392ec9f98c27a2590c33cc52a6ed08bc1c8`.
Archive restore took **777 ms**, measured procedure through verification/replay
**8,007 ms**, with **zero fixture progression lost**. All collection options/indexes
and counts matched; read-only economy, restored sign-in, account identity, pull replay
without a second debit, ownership and equipment passed. Fixture counts: one wallet,
six ledger entries, five reward receipts/completed hands, one daily aggregate,
one catalogue, pull receipt, owned item, banner progress and equipment row.

The temporary archive/key and Docker instance are disposed after the drill; this
checksum records evidence, not a retained recovery point. Local fixture results
meet the approved timing/loss targets at this tiny scale only. They do not measure
provider downtime, operator response, hosted authorization/network access, storage
retention/key escrow or live email. Those checks and the selected backup destination
remain release blockers. Initial drill failures (container tmpfs ownership, then
runtime role lacking migration `collMod`) were diagnosed and corrected; the runtime
role stayed scoped. No live database or deployment was touched.

Final local command with independent passwords for every database role passed at
**12:37:48 UTC** (19:37:48 Bangkok): encrypted SHA-256
`96d280d9f7eef5c460cff40dad7b3298ba28d454bb4438ce93900b50833c6ed4`, restore
**862 ms**, procedure **14,341 ms**, zero fixture progression lost. Metadata and
progression checks passed again; cleanup removed only its generated container and
temporary directory. A fresh read-only review found a valid default-equipment case
without a wallet; a real-repository regression reproduced it before the audit was
corrected. SSR eligible-pool auditing was deferred as a nonblocking extension.
