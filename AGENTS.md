# AGENTS.md

## Scope

These instructions apply throughout this repository. Read any more specific
`AGENTS.md` in the directories you change as well.

## Required Git workflow

- Before editing files or implementing any task, inspect `git status --short --branch`
  and `git branch --show-current`.
- Start new tasks with a clean working directory. If tracked changes or untracked
  files exist, preserve them and ask the user how to handle them. Do not automatically
  stash changes or create a separate worktree to bypass this requirement.
- Run `git fetch origin --prune` before every implementation session, including
  resumed work, and before the final handoff. If fetching fails, stop before further
  implementation and report the blocker; do not work from a potentially stale base.
- For each new task, create and switch to a task branch from the freshly fetched
  `origin/dev` **before changing any files**:
  `git switch --no-track -c codex/<short-task-name> origin/dev`.
  Use the user's branch name when supplied. This applies to code, tests,
  documentation, configuration, dependencies, and generated files.
- When resuming the same task, continue on its existing task branch and preserve
  its in-progress changes. The clean-start requirement applies to new tasks.
- Never implement, commit, or push directly on `dev`. Never force-push, reset,
  rebase, delete, or rewrite local or remote `dev`. If the user requests a local
  update, use `git pull --ff-only origin dev` only while on a clean local `dev`;
  if it cannot fast-forward, report the divergence and preserve both histories.
- Confirm the task branch is active before writing files. If branch creation fails
  or HEAD is detached, resolve branch setup before continuing; never edit on `dev`
  as a fallback.
- If `origin/dev` advances during a task, report that the task branch is behind.
  Do not automatically merge or rebase it onto `origin/dev`; the user handles
  integration unless they explicitly request branch synchronization.
- Preserve unrelated user work. Do not discard, overwrite, or include it in a
  commit. Stage only task-owned files or hunks; avoid indiscriminate `git add .`.
- **Every change must go through a pull request targeting `dev`.** Each task gets
  a PR; follow-up changes for that task update its existing open PR. Push only the
  task branch, with an explicit branch name and its own upstream.
- **The user merges manually.** Do not merge into `dev`, merge a PR, enable
  auto-merge, or automatically delete the task branch after completion.

## Project context

Poker Anime Gacha is a private two-to-six-player Texas Hold'em game with a
cosmetic anime collection. Poker chips are temporary session currency; earned
tickets and owned cosmetics persist. Cosmetics never affect poker strength.

- Read `plan.md` first. It is the system-design and handoff source for product
  scope, architecture, contracts, data, verification, milestones, and checkpoint.
  Keep confirmed decisions distinct from proposed gameplay and economy defaults.
- At the time this file was introduced, the repository contained the consolidated
  plan only. Do not assume application scaffolding, package scripts, tests, or
  deployment already exist, or restore historical code without a request.
- The planned architecture is a Next.js App Router frontend, a separate NestJS
  backend using the default Express adapter and Socket.IO, and MongoDB through the
  official driver with replica-set transactions.
- The planned workspace uses pnpm with one lockfile: `apps/web`, `apps/server`,
  `packages/contracts`, and `packages/poker-engine`. Confirm actual paths and
  scripts as implementation progresses.
- Follow the sequential milestones in `plan.md`: M0 foundation, M1 private rooms,
  M2 poker, M3 tickets, M4 collection, and M5 friends playtest. Implement only the
  scope requested for the current task.

## Development conventions

- Follow established TypeScript, framework, naming, and styling patterns once
  scaffolding exists. Keep changes focused and reuse existing contracts and helpers.
- Keep game authority on the backend. Serialize commands per room, validate intent
  and authorization on the server, and project private cards per recipient.
- Keep the poker engine pure, with clocks and randomness supplied explicitly for
  deterministic tests. Browser state and socket notifications are not authoritative.
- Keep persistent ticket rewards and paid pulls atomic and idempotent. Preserve
  committed balances, receipts, and inventory across retries and interruptions;
  aborted hands must not award rewards.
- Keep database access, credentials, and session handling in server-only code.
  Never expose secrets through `NEXT_PUBLIC_`, commit credentials, or log raw
  sessions, invite tokens, private cards, or sensitive account data.
- Use pnpm and the workspace lockfile once initialized. Avoid unrelated dependency
  upgrades; verify compatible supported versions when adding dependencies.
- Update relevant documentation and the `plan.md` checkpoint when implementation,
  setup, agreed decisions, or milestone evidence changes. Do not claim planned
  features or deployments are complete without evidence.
- Hosting targets Cloudflare Workers Free, Render Free, and MongoDB Atlas Free.
  Deployment, production database operations, and paid upgrades require explicit
  user authorization; preparing code or migrations does not authorize applying them.

## Setup and verification

There is no runnable application or package manifest in the planning baseline.
Inspect the current manifests and CI configuration before choosing commands; do
not present commands from the plan as existing scripts.

- For documentation-only changes, check accuracy against the repository and
  `plan.md`, review the diff, and run `git diff --check`. Application tests are
  unnecessary unless executable code or configuration is also affected.
- Once tooling exists, install with the pinned pnpm version and committed lockfile
  (`pnpm install --frozen-lockfile`). Run the configured lint, typecheck, relevant
  test suites, and production builds for code changes. Use `pnpm check` when the
  planned aggregate script has actually been implemented.
- Add meaningful coverage for changed behavior and bug fixes. Follow `plan.md`
  section 16 and the active implementation task's acceptance criteria.
- Use isolated test data and a real MongoDB replica set for transaction checks.
  Never point tests at the playtest or production database.
- Verify affected user flows with Playwright and check desktop/mobile layouts for
  UI changes. Exercise real Socket.IO clients for transport and reconnect changes.
- Report failures and unavailable checks honestly, with their reasons. Never claim
  a check passed unless it ran and its result was inspected.

## Completion handoff

- Review `git diff --check`, the complete task diff against `origin/dev`, and
  `git status --short --branch`. Ensure only intended changes are included.
- Fix required check failures. If checks remain blocked or failing, describe the
  limitation and open a draft PR; do not describe the result as ready to merge.
- Commit task-owned changes on the task branch, push it with an explicit command
  such as `git push -u origin codex/<short-task-name>`, and create or update its PR
  with **`dev` as the base branch**. Do not rely on the forge's default base.
- Fetch `origin` before final handoff and report whether the task branch contains
  the latest `origin/dev`. If freshness cannot be verified, report the blocker and
  leave the PR in draft. Do not automatically integrate upstream changes.
- If committing, pushing, or PR creation is blocked, preserve the work and report
  the exact blocker and next action. Never fall back to pushing directly to `dev`.
- Summarize the changes, branch name, PR link, verification results, and remaining
  issues. State that the user merges manually; leave the PR and branch for review.
