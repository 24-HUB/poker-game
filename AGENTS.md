# Poker Gacha Anime — AI Agent Instructions

> **Universal instructions for all AI agents (Copilot, Gemini, Claude, Codex, etc.)**
> Provider-specific files (CLAUDE.md, GEMINI.md) reference this file.

---

## 🎯 Project Overview

Texas Hold'em Poker + Gacha Anime Cosmetic System — real-time multiplayer web game.

| Item | Detail |
|------|--------|
| **Repo** | https://github.com/24-HUB/poker-game |
| **Team size** | 2 devs (Dev A = Frontend, Dev B = Backend) |
| **Monorepo tool** | Turborepo + pnpm workspaces |
| **Primary runtime** | Bun (server), Vite (web) |

---

## 🛠️ Tech Stack

### Frontend — `apps/web`
- React 19, Vite 6, TypeScript 5
- TailwindCSS v4, Framer Motion 11
- Zustand 5 (state), TanStack Query 5 (server state)
- Socket.io-client 4, React Router 7

### Backend — `apps/server`
- Bun + Hono 4 (HTTP), Socket.io 4 (WebSocket)
- Drizzle ORM 0.38 + PostgreSQL 16
- Better-Auth 1, Zod 3

### Shared — `packages/shared`
- Game engine: deck, hand evaluator, state machine
- Shared TypeScript types (game, socket events, gacha)

---

## 📁 Repository Structure

```
poker-game/
├── apps/
│   ├── web/src/
│   │   ├── components/{ui,game,gacha,lobby}/
│   │   ├── pages/
│   │   ├── stores/          # Zustand stores
│   │   ├── hooks/
│   │   └── lib/{api.ts,socket.ts}
│   └── server/src/
│       ├── db/{schema.ts,migrate.ts,seed.ts}
│       ├── routes/{auth,rooms,gacha,collection}.ts
│       ├── socket/{index.ts,handlers/,gameManager.ts}
│       └── services/{chipService,gachaService}.ts
├── packages/shared/src/
│   ├── game/{deck,hand,engine,constants}.ts
│   └── types/{game,socket,gacha}.ts
├── AGENTS.md               ← you are here (single source of truth)
├── CLAUDE.md               ← references AGENTS.md
├── GEMINI.md               ← references AGENTS.md
├── .github/
│   ├── copilot-instructions.md
│   └── instructions/
│       ├── frontend.instructions.md
│       ├── backend.instructions.md
│       └── shared.instructions.md
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 🌿 Git Branching Strategy

```
prod        ← production (protected, 2 approvals required)
master      ← release candidate (protected, 2 approvals required)
staging     ← QA / testing (protected, 1 approval required)
dev         ← integration branch (protected, 1 approval required)
main        ← initial setup only
feature/*   ← e.g. feature/F1.1-monorepo-setup
fix/*       ← e.g. fix/hand-evaluator-flush-bug
```

**Flow:** `feature/*` → PR → `dev` → `staging` → `master` → `prod`

Never push directly to `dev`, `staging`, `master`, or `prod`.

---

## ✅ Coding Standards

### TypeScript
- Strict mode always on — no `any` unless absolutely necessary with a comment
- Export types explicitly — never use implicit `any` return types
- Use Zod for all runtime validation at API boundaries
- Prefer `type` over `interface` unless extending is needed

### File & Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities / Services: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE`
- DB schema fields: `camelCase` (Drizzle)

### API Design (Hono)
- All routes return `{ data, error }` envelope
- Errors use consistent shape: `{ error: { code, message } }`
- Validate all inputs with Zod before processing
- Auth middleware on all protected routes

### Socket Events
- Client→Server: `'domain:action'` (e.g., `'game:action'`, `'room:join'`)
- Server→Client: `'domain:event'` (e.g., `'game:stateUpdate'`, `'room:updated'`)
- Always type events with `ClientToServerEvents` / `ServerToClientEvents` from `packages/shared`

### State Management (Frontend)
- Zustand for client-side global state (auth, game, collection)
- TanStack Query for all server data fetching/caching
- Keep stores minimal — no derived state, compute in selectors

---

## 🎮 Game Logic Rules

- **All game logic must live in `packages/shared`** — shared between frontend (preview) and backend (authoritative judge)
- Backend is the single source of truth for game state
- Frontend receives `GameState` updates via Socket.io — never mutate game state locally
- Hand evaluation happens server-side only at showdown
- Chip deductions happen server-side only

---

## 🎰 Gacha Rules

- Pity: soft at 10 pulls (guaranteed SR+), hard at 90 pulls (guaranteed SSR)
- No duplicate SSR until full pool collected
- Pull cost: 150 chips single / 1,350 chips 10-pull
- All gacha logic in `apps/server/src/services/gachaService.ts`

---

## 🚫 Things AI Agents Must NOT Do

- Never push directly to `dev`, `staging`, `master`, or `prod` branches
- Never commit secrets, tokens, or passwords (use `.env` files)
- Never use `any` type without an explanatory comment
- Never modify `packages/shared` game engine without updating both frontend and backend tests
- Never skip Zod validation on API inputs
- Never write raw SQL — use Drizzle ORM query builder

---

## 🔧 Common Commands

```bash
# Install
pnpm install

# Dev (all apps in parallel)
pnpm turbo dev

# Build
pnpm turbo build

# Type check
pnpm turbo typecheck

# DB
cd apps/server && bun run db:migrate && bun run db:seed

# Docker
docker compose up -d postgres
```

---

## 📋 Phase Tracking

| Phase | Goal | Status |
|-------|------|--------|
| Phase 1 | Foundation (monorepo, auth, lobby) | 🔲 Not started |
| Phase 2 | Core Poker (real-time game) | 🔲 Not started |
| Phase 3 | Gacha System | 🔲 Not started |
| Phase 4 | Polish & Social | 🔲 Backlog |

Current active phase: **Phase 1**
