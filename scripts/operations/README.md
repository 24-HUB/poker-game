# One-time friends playtest account provisioning

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
space-free checkout. This review minor is deferred. An operator attempt under
Windows PowerShell 5.1 failed before Node started; source provisioning remains
unconfirmed. Retry with PowerShell 7.
