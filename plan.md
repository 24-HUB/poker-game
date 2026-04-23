gi# 🃏 Poker Gacha Anime — Full Project Plan

## Project Overview

| Item | Detail |
|------|--------|
| **Concept** | Texas Hold'em Poker + Gacha Anime Cosmetic System |
| **Team** | 2 คน (Dev A = Frontend-heavy, Dev B = Backend-heavy) |
| **Time Budget** | 3 ชั่วโมง/วัน |
| **Multiplayer** | Real-time WebSocket |
| **Currency** | Virtual chips only (ไม่มีเงินจริง) |
| **Gacha** | Cosmetic only — card skins / characters / avatars |
| **Target MVP** | Phase 1 + Phase 2 เล่น Texas Hold'em กับเพื่อนได้จริง |

---

## 🛠️ Tech Stack

### Frontend (`apps/web`)
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI library |
| Vite | 6 | Build tool + dev server |
| TypeScript | 5 | Type safety |
| TailwindCSS | v4 | Utility CSS |
| Framer Motion | 11 | Anime-style animations (gacha pull, card flip) |
| Socket.io-client | 4 | Real-time game events |
| Zustand | 5 | Global state (game state, auth, collection) |
| React Router | 7 | Page routing |
| TanStack Query | 5 | Server state / API calls |

### Backend (`apps/server`)
| Package | Version | Purpose |
|---------|---------|---------|
| Bun | latest | Runtime (fast, built-in TS) |
| Hono | 4 | HTTP API framework (ultra-fast, type-safe) |
| Socket.io | 4 | WebSocket server |
| Drizzle ORM | 0.38 | Type-safe DB queries |
| PostgreSQL | 16 | Main database |
| Better-Auth | 1 | Authentication (sessions + JWT) |
| Zod | 3 | Schema validation |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Turborepo | Monorepo task runner (parallel builds) |
| Docker Compose | Local dev + production environment |
| pnpm | Package manager (workspace support) |

---

## 📁 Repository Structure

```
poker-gacha/
├── apps/
│   ├── web/                        # React + Vite Frontend
│   │   ├── src/
│   │   │   ├── components/         # Reusable UI components
│   │   │   │   ├── ui/             # Base components (Button, Modal, Card)
│   │   │   │   ├── game/           # Game-specific components
│   │   │   │   │   ├── GameTable.tsx
│   │   │   │   │   ├── PlayerSeat.tsx
│   │   │   │   │   ├── CardHand.tsx
│   │   │   │   │   ├── BettingControls.tsx
│   │   │   │   │   └── PotDisplay.tsx
│   │   │   │   ├── gacha/          # Gacha-specific components
│   │   │   │   │   ├── GachaBanner.tsx
│   │   │   │   │   ├── PullAnimation.tsx
│   │   │   │   │   └── CollectionGrid.tsx
│   │   │   │   └── lobby/          # Lobby components
│   │   │   │       ├── RoomList.tsx
│   │   │   │       └── CreateRoomModal.tsx
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── LobbyPage.tsx
│   │   │   │   ├── GamePage.tsx
│   │   │   │   ├── GachaPage.tsx
│   │   │   │   ├── CollectionPage.tsx
│   │   │   │   └── ProfilePage.tsx
│   │   │   ├── stores/             # Zustand stores
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── gameStore.ts
│   │   │   │   └── collectionStore.ts
│   │   │   ├── hooks/              # Custom hooks
│   │   │   │   ├── useSocket.ts
│   │   │   │   ├── useGame.ts
│   │   │   │   └── useGacha.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts          # API client (Hono client)
│   │   │   │   └── socket.ts       # Socket.io client instance
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   └── assets/             # Anime character sprites, card art
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                     # Bun + Hono Backend
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts       # Drizzle schema definitions
│       │   │   ├── migrate.ts      # Migration runner
│       │   │   └── seed.ts         # Seed gacha items data
│       │   ├── routes/
│       │   │   ├── auth.ts         # Better-Auth routes
│       │   │   ├── rooms.ts        # Lobby room CRUD
│       │   │   ├── gacha.ts        # Gacha pull endpoint
│       │   │   └── collection.ts   # User collection endpoint
│       │   ├── socket/
│       │   │   ├── index.ts        # Socket.io server setup
│       │   │   ├── handlers/
│       │   │   │   ├── room.ts     # join/leave room events
│       │   │   │   └── game.ts     # game action events
│       │   │   └── gameManager.ts  # In-memory active games map
│       │   ├── services/
│       │   │   ├── chipService.ts  # Win/lose chip logic
│       │   │   └── gachaService.ts # Rarity roll logic
│       │   └── index.ts            # Main entry point
│       └── package.json
│
├── packages/
│   └── shared/                     # Shared between web + server
│       ├── src/
│       │   ├── game/
│       │   │   ├── deck.ts         # Card type, suits, ranks, shuffle
│       │   │   ├── hand.ts         # Hand evaluator (pair → royal flush)
│       │   │   ├── engine.ts       # Game state machine
│       │   │   └── constants.ts    # BLIND_SMALL, BLIND_BIG, etc.
│       │   └── types/
│       │       ├── game.ts         # GameState, Player, Card types
│       │       ├── socket.ts       # SocketEvent types (ClientToServer, ServerToClient)
│       │       └── gacha.ts        # GachaItem, Rarity types
│       └── package.json
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 🗄️ Database Schema (Drizzle)

```ts
// users
users {
  id: uuid PRIMARY KEY
  username: varchar(50) UNIQUE NOT NULL
  email: varchar(255) UNIQUE NOT NULL
  passwordHash: text NOT NULL
  avatarUrl: text
  chips: integer DEFAULT 1000        // starting chips
  createdAt: timestamp
}

// sessions (Better-Auth managed)
sessions {
  id: text PRIMARY KEY
  userId: uuid REFERENCES users(id)
  expiresAt: timestamp
}

// rooms (lobby)
rooms {
  id: uuid PRIMARY KEY
  name: varchar(100)
  hostId: uuid REFERENCES users(id)
  maxPlayers: integer DEFAULT 6
  minBet: integer DEFAULT 10
  status: enum('waiting', 'playing', 'finished')
  createdAt: timestamp
}

// gacha_items
gacha_items {
  id: uuid PRIMARY KEY
  name: varchar(100)
  type: enum('card_skin', 'avatar', 'table_theme')
  rarity: enum('R', 'SR', 'SSR')
  imageUrl: text
  description: text
}

// user_collection
user_collection {
  id: uuid PRIMARY KEY
  userId: uuid REFERENCES users(id)
  itemId: uuid REFERENCES gacha_items(id)
  obtainedAt: timestamp
  isEquipped: boolean DEFAULT false
  UNIQUE(userId, itemId)             // ไม่ซ้ำ
}

// game_history
game_history {
  id: uuid PRIMARY KEY
  roomId: uuid REFERENCES rooms(id)
  winnerId: uuid REFERENCES users(id)
  potAmount: integer
  handResult: jsonb                  // full hand snapshot
  playedAt: timestamp
}
```

---

## 🔌 API Endpoints (Hono)

### Auth
```
POST /api/auth/register    { username, email, password }
POST /api/auth/login       { email, password }
POST /api/auth/logout
GET  /api/auth/me          → User profile + chips
```

### Rooms (Lobby)
```
GET    /api/rooms              → List open rooms
POST   /api/rooms              → Create room { name, maxPlayers, minBet }
GET    /api/rooms/:id          → Room details
DELETE /api/rooms/:id          → Close room (host only)
```

### Gacha
```
GET  /api/gacha/banners        → Current active banners
POST /api/gacha/pull           { bannerId, count: 1 | 10 } → GachaItem[]
GET  /api/gacha/rates/:id      → Rate table for banner
```

### Collection
```
GET   /api/collection          → All items user owns
PATCH /api/collection/:itemId  { equipped: true } → Equip item
```

### Profile
```
GET /api/users/:id             → Public profile + stats
GET /api/leaderboard           → Top 50 by chips
```

---

## 📡 Socket.io Events

### Client → Server
```ts
// Room
'room:join'        { roomId: string }
'room:leave'       { roomId: string }
'room:ready'       { roomId: string }

// Game Actions
'game:action'      { roomId: string, action: 'fold' | 'call' | 'check' | 'raise', amount?: number }
'game:chat'        { roomId: string, message: string }
```

### Server → Client
```ts
// Room updates
'room:updated'     RoomState
'room:playerJoined' { player: PlayerInfo }
'room:playerLeft'   { playerId: string }

// Game lifecycle
'game:started'     GameState              // game begins
'game:stateUpdate' GameState              // after every action
'game:yourCards'   { cards: Card[] }      // private — sent only to 1 player
'game:newStreet'   { street: 'flop' | 'turn' | 'river', communityCards: Card[] }
'game:ended'       { winner: PlayerInfo, pot: number, hands: Record<string, Card[]> }
'game:playerTurn'  { playerId: string, timeoutMs: number }

// Chat
'game:chatMessage' { playerId: string, username: string, message: string }
```

---

## 🎮 Game Engine Design (`packages/shared`)

### Card & Deck
```ts
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A'
type Card = { suit: Suit; rank: Rank }

function createDeck(): Card[]         // 52 cards
function shuffle(deck: Card[]): Card[] // Fisher-Yates
```

### Hand Evaluator
```ts
type HandRank = 
  | 'high_card' | 'pair' | 'two_pair' | 'three_of_a_kind'
  | 'straight' | 'flush' | 'full_house' | 'four_of_a_kind'
  | 'straight_flush' | 'royal_flush'

type HandResult = { rank: HandRank; score: number; cards: Card[] }

function evaluateHand(cards: Card[]): HandResult   // best 5 from 7
function compareHands(a: HandResult, b: HandResult): number
```

### Game State Machine
```ts
type GamePhase = 'waiting' | 'pre_flop' | 'flop' | 'turn' | 'river' | 'showdown'

type GameState = {
  phase: GamePhase
  players: PlayerState[]
  communityCards: Card[]
  pot: number
  currentBet: number
  activePlayerId: string
  dealer: number       // index
  smallBlind: number
  bigBlind: number
}

// State transitions:
// waiting → pre_flop (deal 2 cards each)
// pre_flop → flop (deal 3 community)
// flop → turn (deal 1)
// turn → river (deal 1)
// river → showdown (evaluate all hands)
// showdown → waiting (reset)
```

---

## 🎰 Gacha System Design

### Rarity Weights
```
R   (Common)   — 70% weight  — card backs, table icons
SR  (Rare)     — 25% weight  — character avatars
SSR (Super Rare) — 5% weight — animated card skins, special fx
```

### Pity System
- ทุก 10 pulls รับ SR ขั้นต่ำ 1 ใบ (soft pity)
- ทุก 90 pulls รับ SSR ขั้นต่ำ 1 ใบ (hard pity)
- ไม่มี duplicate SSR (จนกว่าจะครบ pool)

### Pull Cost
- Single pull: **150 chips**
- 10-pull: **1,350 chips** (10% discount)
- เริ่มต้นได้ chips 1,000 → ฟรี 6 single pulls

### Gacha Pull UI Flow
1. กด "Pull" → แสดง loading portal animation (Framer Motion)
2. Cards flip เปิดทีละใบ หรือ 10 ใบพร้อมกัน
3. SSR = flashy golden animation + screen shake
4. SR = purple glow effect
5. ปุ่ม "Add to Collection" → redirect collection page

---

## 🎨 Visual Style Guide

### Color Palette
```
Background     : #0f0c29 → #302b63 → #24243e  (deep purple gradient)
Primary Accent : #ffd700  (gold — for chips, SSR)
Secondary      : #9b59b6  (purple — SR)
Common         : #7f8c8d  (grey — R)
Success/Win    : #2ecc71
Danger/Fold    : #e74c3c
Table Felt     : #1a6b3c  (dark green)
Card Back      : anime-art based on equipped skin
```

### Font
- Headings: `Cinzel` (fantasy/poker feel)
- Body: `Inter` (clean, readable)
- Numbers (chips): `JetBrains Mono`

### Animations (Framer Motion)
- Card deal: slide in từ dealer position → player hand
- Chip move: arc animation เข้า pot
- Gacha pull: portal swirl → card flip
- Win: confetti burst + chip rain

---

## 📋 Feature Breakdown with Estimated Days

### 📊 Overall Progress (as of May 2026 — post-TDD session)

| Phase | Goal | Completion | Notes |
|-------|------|-----------|-------|
| Phase 1 | Foundation | **✅ 100%** | All done — auth, lobby, routing, API client |
| Phase 2 | Core Poker | **✅ 100%** | Fully implemented in `server.js` + frontend components |
| Phase 3 | Gacha | **✅ 100%** | Pull API, collection, equip skin to card backs — all done |
| Phase 4 | Polish | **✅ 95%** | Daily reward, history, leaderboard, chat, animations, sounds — done; tournament backlog |

### 🧪 Test Coverage (added TDD session)

| Suite | File | Tests | Status |
|-------|------|-------|--------|
| Auth API | `api.integration.test.ts` | 11 | ✅ All pass |
| Gacha API | `gacha.integration.test.ts` | 16 | ✅ All pass |
| Collection API | `collection.integration.test.ts` | 11 | ✅ All pass |
| Rooms API | `rooms.integration.test.ts` | 13 | ✅ All pass |
| Social/Profile API | `social.integration.test.ts` | 15 | ✅ All pass |
| Shared — Deck | `packages/shared/.../deck.test.ts` | 8+ | ✅ All pass |
| Shared — Hand Evaluator | `packages/shared/.../hand.test.ts` | 20+ | ✅ All pass |
| Shared — Game Engine | `packages/shared/.../engine.test.ts` | 32+ | ✅ All pass |

**Total: 66 integration tests + 60+ unit tests, 0 failures.**

### Bug Fixes (TDD Prove-It pattern)
- ✅ **Fixed**: Missing email format validation in `POST /api/auth/register` — now returns 400 with `VALIDATION` code for invalid emails
- ✅ **Fixed**: Test preconditions for 10-pull (requires 1350 chips; new users start with 1000) — updated tests to use correct chip budget or DB setup

---

### 🟢 Phase 1 — Foundation (~3-4 วัน)
**Goal**: ตั้ง project + login + เข้า lobby
**Status (Apr 2026)**: ✅ 100% complete

| ID | Feature | Dev | Est. | Status |
|----|---------|-----|------|--------|
| F1.1 | Monorepo setup (Turborepo + Bun + Vite) | A | 0.5 วัน | ✅ Done |
| F1.2 | DB schema + Drizzle setup + Docker Postgres | B | 0.5 วัน | ✅ Done |
| F1.3 | Auth API (register/login/logout/me) — Better-Auth | B | 1 วัน | ✅ Done |
| F1.4 | Auth UI (Login page, Register page) | A | 1 วัน | ✅ Done — `pages/LoginPage.tsx`, `pages/RegisterPage.tsx` |
| F1.5 | Lobby page + Room list + Create room | A | 1 วัน | ✅ Done — `pages/LobbyPage.tsx`, `components/lobby/*` |
| F1.6 | Rooms API (CRUD) | B | 0.5 วัน | ✅ Done |
| F1.7 | Docker Compose (web + server + postgres) | B | 0.5 วัน | ✅ Done |
| F1.8 | React Router 7 routing setup + `lib/api.ts` client | A | 0.5 วัน | ✅ Done — `App.tsx` rewritten with `BrowserRouter` + routes |
| F1.9 | TanStack Query provider + auth/room query hooks | A | 0.5 วัน | ✅ Done — `main.tsx` QueryClientProvider + `hooks/useAuth.ts`, `hooks/useRooms.ts` |

---

### � Phase 2 — Core Poker (~6-8 วัน)
**Goal**: เล่น Texas Hold'em 2-6 คน real-time ได้จริง
**Status (May 2026)**: ✅ 100% complete — all implemented in `apps/server/src/server.js`

| ID | Feature | Dev | Est. | Status |
|----|---------|-----|------|--------|
| F2.1 | Card + Deck + Shuffle (packages/shared) | A+B | 0.5 วัน | ✅ Done |
| F2.2 | Hand evaluator (packages/shared) | B | 1 วัน | ✅ Done |
| F2.3 | Game state machine (packages/shared) | B | 1 วัน | ✅ Done |
| F2.4 | Socket.io server setup + room management | B | 0.5 วัน | ✅ Done — mounted in `server.js` (actual entry point) |
| F2.5 | Game event handlers (join/action/end) | B | 1 วัน | ✅ Done — `room:join`, `room:ready`, `game:action`, `game:chat` in `server.js` |
| F2.6 | Game table UI (green felt, seats) | A | 1 วัน | ✅ Done (GameTable, PlayerSeat) |
| F2.7 | Player hand display (private cards) | A | 0.5 วัน | ✅ Done (BettingControls shows hole cards) |
| F2.8 | Community cards (flop/turn/river) | A | 0.5 วัน | ✅ Done (CommunityCards component) |
| F2.9 | Betting controls UI (call/raise/fold/check) | A | 1 วัน | ✅ Done |
| F2.10 | Pot + chip display | A | 0.5 วัน | ✅ Done (in GameTable) |
| F2.11 | Turn timer + active player highlight | A+B | 0.5 วัน | ✅ Done (30s auto-fold in GameManager) |
| F2.12 | End game showdown + winner screen | A+B | 1 วัน | ✅ Done (showdown overlay in GameTable) |
| F2.13 | Chip update after game (chipService) | B | 0.5 วัน | ✅ Done — inline in game handler in `server.js` |
| F2.14 | Wire Socket.io into server entry point | B | 0.5 วัน | ✅ Done — `server.js` is the active entry point with Socket.io |
| F2.15 | `game:yourCards` private emit per-socket | B | 0.5 วัน | ✅ Done — per-socket emit in `room:ready` and reconnect |
| F2.16 | `GamePage.tsx` wired to real socket events | A | 1 วัน | ✅ Done |
| F2.17 | Multi-round dealer rotation after each hand | B | 0.5 วัน | ✅ Done — `room.dealerIndex` rotates in `server.js` |
| F2.18 | Side pot calculation for all-in scenarios | B | 1 วัน | ✅ Done — `resolveShowdown` in `packages/shared` |
| F2.19 | Socket reconnect — restore game state | B | 0.5 วัน | ✅ Done — state re-emitted on `room:join` |
| F2.20 | Game history saved to DB on showdown | B | 0.5 วัน | ✅ Done — `game_history` insert in `server.js` |
| F2.21 | Framer Motion card deal animation | A | 1 วัน | ✅ Done — `PlayerSeat.tsx` deal animation (y: -60 → 0, rotateY: 180 → 0) |
| F2.22 | Chip arc animation (bet → pot) | A | 0.5 วัน | ✅ Done — `ChipFly` in `GameTable.tsx` |

---

### � Phase 3 — Gacha System (~4-5 วัน)
**Goal**: ดึง gacha ได้ + แสดง collection + ใส่ skin ในเกม
**Status (May 2026)**: ✅ 100% complete

| ID | Feature | Dev | Est. | Status |
|----|---------|-----|------|--------|
| F3.1 | gacha_items + user_collection schema + seed | B | 0.5 วัน | ✅ Done — `seedGachaItems()` auto-runs at server start |
| F3.2 | Gacha pull API + rarity service + pity tracker | B | 1 วัน | ✅ Done — `rollRarity()` + pity counters in `server.js` |
| F3.3 | Gacha routes (`/api/gacha/*`, `/api/collection/*`) | B | 0.5 วัน | ✅ Done — `/api/gacha/banners`, `/api/gacha/rates/:id`, `/api/gacha/pull`, `/api/collection` |
| F3.4 | Gacha banner page UI (`GachaPage.tsx`) | A | 0.5 วัน | ✅ Done — `pages/GachaPage.tsx` |
| F3.5 | Pull animation (portal → card flip) Framer Motion | A | 1.5 วัน | ✅ Done — `components/gacha/PullAnimation.tsx` |
| F3.6 | Collection page + grid + equip toggle | A | 1 วัน | ✅ Done — `pages/CollectionPage.tsx` |
| F3.7 | `collectionStore.ts` Zustand store | A | 0.5 วัน | ✅ Done — `stores/collectionStore.ts` |
| F3.8 | `useGacha.ts` hook + pity counter display | A | 0.5 วัน | ✅ Done — `hooks/useGacha.ts` |
| F3.9 | No-duplicate SSR logic in `gachaService.ts` | B | 0.5 วัน | ✅ Done — `pickItem()` deduplicates SSR in `server.js` |
| F3.10 | Equip skin applied to card backs in game | A+B | 1 วัน | ✅ Done — `PlayerSeat.tsx` uses `equippedCardSkinId` from `collectionStore`; `SKIN_GRADIENT` map renders equipped skin |

---

### 🟢 Phase 4 — Polish & Social (ต่อเรื่อยๆ)
**Priority order — ทำตามลำดับ**
**Status (May 2026)**: ~95% complete

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F4.1 | Leaderboard (chip ranking top 50) | HIGH | ✅ Done — `pages/LeaderboardPage.tsx` + `/api/leaderboard` |
| F4.2 | Player profile page + stats | HIGH | ✅ Done — `pages/ProfilePage.tsx` + `/api/users/:id` |
| F4.3 | Daily login reward (chip bonus) | MEDIUM | ✅ Done — `/api/auth/me` grants +200 chips once per day |
| F4.4 | In-game chat (Socket.io) | MEDIUM | ✅ Done — chat widget in `GameTable.tsx` |
| F4.5 | Card deal + chip move animations | MEDIUM | ✅ Done — Framer Motion in `PlayerSeat.tsx` + `GameTable.tsx` |
| F4.6 | Sound effects (card flip, chip clink) | LOW | ✅ Done — `lib/sounds.ts` |
| F4.7 | Game history page | LOW | ✅ Done — `pages/GameHistoryPage.tsx` + `/api/history` |
| F4.8 | More poker modes (5-Card Draw) | LOW | 🔲 Backlog |
| F4.9 | Tournament bracket mode | BACKLOG | 🔲 Not started |

---

## ⏱️ Daily Workflow (3 ชั่วโมง/วัน)

```
00:00 - 00:30  | 🔁 Sync + Review PRs
00:30 - 02:30  | 💻 Code ตาม feature ที่ assign
02:30 - 03:00  | ✅ Test + Commit + Push + Discord note
```

### Git Workflow
- `main` — stable, deploy-ready เท่านั้น
- `dev` — integration branch
- `feature/F1.1-monorepo-setup` — feature branches ตาม ID
- PR ต้องผ่าน review อีกคนก่อน merge dev
- Merge dev → main เมื่อจบ phase

---

## 🗺️ Timeline Estimate

```
Day 01-04   ████░░░░░░░░░░░░  Phase 1: Foundation
Day 05-12   ████████░░░░░░░░  Phase 2: Core Game (MVP)
Day 13-17   █████░░░░░░░░░░░  Phase 3: Gacha
Day 18+     ████████████████  Phase 4: Polish (ongoing)
```

> MVP (Phase 1 + 2) ภายใน ~12 วัน ≈ 36 ชั่วโมงรวมกัน

---

## ⚡ Quick Start Commands

```bash
# Setup
git clone <repo>
pnpm install
pnpm turbo build

# Dev
docker compose up -d postgres
pnpm turbo dev           # starts both web + server

# DB
cd apps/server
bun run db:migrate
bun run db:seed

# Build
pnpm turbo build
```

---

## ✅ Definition of Done (DoD) per Feature

Feature ถือว่า "done" เมื่อ:
1. ✅ Feature ทำงานถูกต้องใน local dev
2. ✅ Code ผ่าน TypeScript type check (ไม่มี `any` โดยไม่จำเป็น)
3. ✅ PR ถูก review + approve จากอีกคน
4. ✅ Merge เข้า `dev` branch ได้โดยไม่มี conflict
5. ✅ สรุปสั้นๆ ใน Discord/Note ว่าทำอะไรไปบ้าง

---

## 📝 Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Runtime | Bun | Fast startup, built-in TS, built-in test runner |
| HTTP Framework | Hono | Type-safe RPC, works great with Bun, tiny footprint |
| ORM | Drizzle | Type-safe SQL, migrations, no magic |
| State Management | Zustand | Lightweight, TS-friendly, no boilerplate |
| Animation | Framer Motion | Best React animation library for anime fx |
| Auth | Better-Auth | Modern, framework-agnostic, works with Drizzle |
| Game Logic Location | packages/shared | Reuse in both frontend (preview) and backend (judge) |
| Gacha | Cosmetic only | Keeps game fair + simpler to implement |
| Pity System | Soft 10 + Hard 90 | Standard gacha UX expectation |
