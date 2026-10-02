# M4 — Celestial cosmetic collection

Task branch: `codex/m4-cosmetic-collection`, from `origin/dev` at `a3cb9794`
(merged M3 PR #12). The user authorized M4 implementation on 2026-10-01.

Approved launch policy: single/ten pull 5/50 tickets, R/SR/SSR 70/25/5%,
SR+ at pull 10 and SSR at pull 90, owned SSR exclusion until complete,
duplicates without refund, and original celestial vector artwork. Each slot
has three R (Star Scout, Moon Courier, Solar Knight), two SR (Comet Mage,
Eclipse Oracle), and one SSR (Astral Empress). Free built-in defaults remain.

Implement sequentially following the M4 tasks in
`docs/superpowers/plans/2026-09-30-m3-through-production.md`:

1. Contracts, immutable catalogue, pure draw policy and migration 005; test
   rarity/pity boundaries, ownership exclusion, invalid catalogues and publication.
2. Account-scoped atomic pull purchases and durable receipts; test concurrency,
   rollback, uncertain commitment, privacy and reward/pull balance invariants.
3. Reload-safe pull screen using the original account/request identity;
   disclose cost/odds/duplicate rules and show committed results only.
4. Collection and revision-checked equipment; freeze equipment in durable
   hand records and render the same selection for every recipient until next deal.

Use the existing Nest/MongoDB transaction runner and account queries. Original
SVG artwork is authored in the repository with provenance; no external asset or
provider is required. The purchase route is `/pulls` (the plan's invitations
path would conflict with room invitations). Collection is `/collection`.
No deployment, live database publication, or automatic merge is authorized.

Verify frozen install, pure policy/contracts, real disposable replica-set cases,
workspace checks and production builds, Chromium account flows, 360px/desktop
layouts and keyboard/reduced-motion behavior. Publish a PR targeting `dev`;
the user merges manually. Record actual evidence in the existing checkpoints.

## Verification handoff - 2026-10-02

Implemented in commit `0b3ab8b3` on PR [#13](https://github.com/24-HUB/poker-game/pull/13),
base `dev`. Local server/web/contract/engine and Chromium checks passed; the
fresh UI finish verdict is **ship** with all six findings resolved.
[Linux CI on saved head `c89772ee`](https://github.com/24-HUB/poker-game/actions/runs/36879381633/job/110426938910)
passed migrations, aggregate checks and Cloudflare Worker packaging.
The latest documentation head must pass CI before manual merge. Detailed
counts and resume history remain in CHECKPOINT.md and plan.md. M5 is pending.
