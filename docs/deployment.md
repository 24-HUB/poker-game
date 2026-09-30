# M0/M1 deployment preparation

For the complete remaining release sequence, see the
[M3 through production plan](superpowers/plans/2026-09-30-m3-through-production.md),
especially M5 hosted acceptance, M6 authorized production cutover, and M7
operations. The steps below remain the original preparation baseline, not
evidence of a live deployment. The actual frontend adapter is OpenNext.

Deployment is intentionally manual. This repository prepares configuration and smoke checks but does not authorize creating provider resources, applying migrations to a live database, uploading secrets, or deploying either service.

## Provider layout

- Cloudflare Workers serves the Next.js application and proxies only `/api/*` and `/socket.io/*` to the fixed Render backend.
- Render runs the NestJS server from `render.yaml`. Automatic deploys are disabled and `/health/deploy` is the deployment health check.
- MongoDB Atlas supplies a replica-set connection. Do not use the local Docker database or a standalone server for deployment.

## Required configuration

Configure these values in provider dashboards; never commit their live values.

| Provider | Name | Purpose |
| --- | --- | --- |
| Cloudflare | `BACKEND_ORIGIN` | Exact HTTPS Render backend origin |
| Cloudflare | `PUBLIC_ORIGIN` | Exact HTTPS public Worker origin |
| Cloudflare secret | `PROXY_SECRET` | Shared random proxy credential, identical to Render |
| Render | `PUBLIC_ORIGIN` | Exact HTTPS public Worker origin |
| Render | `PROXY_SECRET` | Shared random proxy credential, identical to Cloudflare |
| Render | `MONGODB_URI` | Atlas replica-set URI |
| Render | `MONGODB_DATABASE` | Dedicated playtest database name |
| Render | `BETTER_AUTH_SECRET` | At least 32 random characters |
| Render | `REGISTRATION_INVITE_CODE_SHA256` | Lowercase SHA-256 hex digest of the temporary registration code |

Wrangler keeps dashboard-defined variables during builds. The repository contains no deploy workflow and no Cloudflare or Render credentials. When deployment is separately authorized, scope provider tokens to the single service and run migrations as a controlled step before the manual Render deploy; the free Render plan does not provide a pre-deploy migration step.

## Local acceptance

```powershell
docker compose up -d mongodb mongodb-standalone
pnpm db:init
pnpm db:migrate
pnpm db:migrate
pnpm check
pnpm --filter @poker/web exec playwright test
```

The OpenNext Worker bundle is verified in Linux CI because Windows requires symlink privileges during packaging.

## Authorized deployment smoke

After both providers and Atlas are configured by an authorized operator:

```powershell
$env:PUBLIC_ORIGIN = 'https://play.example.com'
pnpm smoke:deployment
```

The smoke command prints only shell/readiness status. It does not print the origin, cookies, credentials, response bodies, or environment secrets. A sleeping, unreachable, standby, or malformed deployment exits nonzero with a bounded generic error.

Deployed M0/M1 acceptance: **not run—deployment not authorized**.
