# Playtest operator tools

## Committed pull response loss

Use only in a separately approved gameplay/economy window after the reviewed
tooling is merged and its candidate is compatible with the deployed API.
Run `node apps/web/scripts/operators/hosted-pull-recovery.mjs` from the repository
root in an interactive terminal. It accepts **no arguments**. Select A or B and
type `WITHHOLD ONE 5-TICKET PULL RESPONSE` at its prompt. Sign in privately in its
ephemeral headed browser, open Pulls, and press Enter in the terminal. Wait for
**Armed** before clicking the single five-ticket Open button exactly once.

The runner verifies the account, forwards one request without redirects/retries,
holds its validated HTTP 201 receipt, reloads the same page, and compares normal
GET recovery and one debit. It prints only fixed categories/booleans. On uncertainty,
inspect the original pending receipt before any further purchase or closing the
browser. No new request, credential file, trace, video or screenshot is created.
Terminal EOF or a graceful interrupt retains an unresolved browser in memory;
inspect/reconcile there and close its window manually. Do not force-kill the
process or close that browser while the outcome is uncertain. If the OS/browser
crashes, stop new purchases and use the approved source receipt audit to locate
the one attempted purchase before any retry; never start a replacement request.
`pnpm test:operator` checks guards and a real local rejected-response case;
the disposable collection Chromium flow rehearses successful committed recovery.

## Isolated restored accounts

This is preparation/local tooling, not permission to read a real archive or stop
source writers. Under the separately approved backup packet, quiesce **every**
writer first. Retain a full private pre-application manifest from
`restoreManifest(db)` in `restore-account-check.mjs` using the already approved
read-only source connection. It includes collection options, ordered compound
index keys, document fingerprints and counts. Encrypt its JSON separately with
age; retain it beside the encrypted archive and its independent SHA256. Do not
put these values, passwords, receipt IDs or plaintext documents in Git.

Prepare the image **before** selecting/mounting backup material, from the reviewed
clean committed checkout with Node 22.16.0 and pnpm 10.33.0:

```powershell
node scripts/operations/build-restore-runner.mjs
```

The builder accepts no context override. It archives only the named tracked app,
package and tool source paths at HEAD; `.env`, ignored/untracked private files and
operator archives are excluded. It installs/builds the pinned workspace and matching
Chromium before any real material exists in the workload. The resulting image is
`poker-restore:<full-candidate-sha>` with a matching candidate label. Build requires
Docker network access; restored execution has none. Review image/source and CI,
and manually merge the PR before real use.

```powershell
pnpm test:restore-accounts
pwsh -NoProfile -File scripts/operations/Restore-PlaytestAccounts.ps1
```

The test uses generated local accounts, encryption and namespaces only. It accepts
no URI/archive environment override. The PowerShell 7 wrapper separately requires
`RESTORE ARCHIVE INTO ISOLATED LOCAL RUNNER`, reviewed image SHA, encrypted archive
path/checksum, encrypted manifest path and existing local age identity path. It
asks A/B logins, backed-up passwords and original purchase request IDs through
masked prompts and sends them through stdin. age and Docker must be installed.
No source database URI is accepted. No real archive is read by the agent.

Before decryption, actual Docker inspection and namespace probes must confirm:
MongoDB `--network none`, app/browser sharing that namespace, no published ports,
host bind/volume/device/socket mounts or default route, and external TCP failure.
Authenticated MongoDB uses tmpfs, a fresh local key/password and disabled TTL
deletion. age streams the archive to mongorestore; both exits are checked. Only
`poker_playtest.*` maps into a unique `poker_test_restore_<uuid>` namespace. There
is no source restore, source credential, fixture seeding or migration on copied data.

The full manifest must match before apps start. The runner then uses fresh local
auth/proxy secrets, memory email, closed admission/economy and no automatic jobs.
Chromium inside the same namespace signs in through the normal UI, checks both
accounts' backed-up purchase/ownership/equipment content, replays original receipts
and proves durable economy values unchanged. Local auth/lease/session writes are
separate from the pre-app full-manifest comparison. Containers are removed on exit;
the retained encrypted archive/manifest/key are never mounted into them.
Chromium's online heuristic is explicitly set to available for namespace loopback;
this changes no interface, default route, Docker setting or egress rule. Actual
containment and failed external TCP access are checked again after the browser run.

Only an `ok: true` result can support archive certification. Also record archive
quiescence time, actual loss window, elapsed time to a local safe-reopen decision,
and source controls restored/read back under the approved reopening procedure.
A missing A/B purchase or any blocked check leaves R4 open. Retain the previous
good backup. The October 17 archive predates A/B and cannot certify their progression.

## One-time friends playtest account provisioning

This operator-only helper creates **two new preverified accounts** for the existing
`poker_g / Cluster0 / poker_playtest` target. The source hostname is pinned to the
Atlas driver template inspected on 2026-10-18: `cluster0.lxb4kqs.mongodb.net`.
It changes no deployed auth settings and sends no email. Each account still uses
an email-shaped login identifier and password. Preverified here means an explicit
operator override; it does **not** prove mailbox ownership or pass signup/recovery
acceptance. Use the two operator-controlled aliases requested for A/B.

Requires Node 22.16.0, pinned workspace dependencies, **PowerShell 7 (`pwsh`)**,
and an existing permitted Atlas connection. Minimum source privileges are `find`
and `insert` on `poker_playtest.user` and `poker_playtest.account`; both existing
collections must be present. No update/delete, migrations or schema privileges
are required. The helper does not create a database role, credential or IP rule.
If Atlas denies access, stop and prepare separately approved, short-lived scoped
access; do not reveal the deployed runtime URI or widen a shared network rule.

From the repository root, run the read-only preflight:

```powershell
pwsh -NoProfile -File .\scripts\operations\Provision-PlaytestAccounts.ps1
```

Run this with PowerShell 7 (`pwsh`), not Windows PowerShell 5.1 (`powershell`).
The wrapper rejects older versions before asking for any private inputs. If
`pwsh` is not on your terminal's PATH, invoke an installed PowerShell 7 executable
by its full path with PowerShell's `&` call operator. The older shell lacks the
`ProcessStartInfo.ArgumentList` API used to launch Node safely.

Enter the connection URI and new A/B passwords only in the masked prompts; enter
two distinct new aliases when asked. Nothing is written to credential files,
command arguments or logs. Passwords must be 16–128 characters. Preserve them in
your own password manager. A successful plan prints only counts and `planned`.

After reviewing the exact target and authorizing these source inserts, run:

```powershell
pwsh -NoProfile -File .\scripts\operations\Provision-PlaytestAccounts.ps1 -Apply
```

The operator must type `CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS`. The two user
and two credential records commit in **one majority-write transaction**, with
passwords hashed by the installed Better Auth implementation. Existing aliases
are refused: no overwrite, password reset or automatic adoption of existing users.
No sessions, wallets, tickets, receipts, cosmetics or equipment are created by
this operation. The normal app initializes a zero-ticket wallet after sign-in.

On `FAILED_OR_UNCERTAIN`, inspect the two aliases using approved read access before
any retry; do not assume a timeout rolled back or automatically delete accounts.
An `ACCOUNT_EXISTS` result also stops the operation. No success output includes
email addresses, password hashes, session cookies, credentials or driver errors.
The final PowerShell exception repeats only a safe CLI label and `DRY_RUN` or
`APPLY`; unknown child errors become `HELPER_PROCESS_FAILED`. If the attempted mode
is unknown, use a dry run only to check the same aliases before any further apply.

Verify both through ordinary browser sign-in, then compare identity/balance and
collection baselines. Keep addresses and private mappings outside Git. Do not
claim hosted creation, verification mail or recovery acceptance from the local test.

Regression: `pnpm test:provision` builds the pinned server and tests against a
unique `poker_test_provision_*` database at fixed loopback port 27018. It accepts
no hosted environment override and drops only its generated fixture database.
It verifies target/confirmation rejection, dry-run, exact pair creation, real
app sign-in, zero-wallet initialization, duplicate refusal, rollback and intact
unrelated progression. These tests also run under `pnpm check`.

Known portability limit: the test's CLI path conversion does not support checkout
paths containing percent-escaped characters/spaces. Use `pwsh` and the current
space-free checkout. This review minor is deferred. The earlier Windows PowerShell
5.1 attempt failed before Node started. Subsequent October 18 operator apply and
independent normal A/B sign-in/source-baseline evidence are recorded in
`docs/releases/2026-10-18-friends-playtest.md`; do not repeat provisioning on resume.
