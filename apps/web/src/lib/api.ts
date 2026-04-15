/** Typed API client — wraps all backend Hono endpoints */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
    ...init,
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.error?.message ?? body?.error ?? 'Request failed';
    throw new Error(msg);
  }

  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  chips: number;
  avatarUrl: string | null;
};

export type AuthResponse = { user: AuthUser; session: unknown };

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: AuthUser; dailyReward: { chips: number } | null }>('/api/auth/me'),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────

export type Room = {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  minBet: number;
  status: 'waiting' | 'playing' | 'finished';
  playerCount: number;
  createdAt: string;
};

export type CreateRoomInput = {
  name: string;
  maxPlayers?: number;
  minBet?: number;
};

export const roomsApi = {
  list: () => request<Room[]>('/api/rooms'),

  get: (id: string) => request<Room>(`/api/rooms/${id}`),

  create: (data: CreateRoomInput) =>
    request<Room>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/api/rooms/${id}`, { method: 'DELETE' }),
};

// ── Gacha ─────────────────────────────────────────────────────────────────────

export type Rarity = 'R' | 'SR' | 'SSR';
export type ItemType = 'card_skin' | 'avatar' | 'table_theme';

export type GachaItem = {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  imageUrl: string;
  description: string;
  isNew?: boolean;
  isEquipped?: boolean;
};

export type GachaBanner = {
  id: string;
  name: string;
  description: string;
  featuredItem: GachaItem | undefined;
  rates: { R: number; SR: number; SSR: number };
};

export type PullResult = {
  items: GachaItem[];
  chips: number;
};

export const gachaApi = {
  banners: () => request<GachaBanner[]>('/api/gacha/banners'),

  pull: (count: 1 | 10) =>
    request<PullResult>('/api/gacha/pull', {
      method: 'POST',
      body: JSON.stringify({ count }),
    }),
};

// ── Collection ────────────────────────────────────────────────────────────────

export type CollectionResponse = { items: GachaItem[]; equippedCardSkin: string | null };

export const collectionApi = {
  list: () => request<CollectionResponse>('/api/collection'),

  equip: (itemId: string) =>
    request<{ equipped: boolean; itemId: string; equippedCardSkin: string | null }>(
      `/api/collection/${itemId}/equip`,
      { method: 'PATCH' },
    ),
};

// ── Leaderboard ───────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  id: string;
  username: string;
  chips: number;
  wins: number;
  handsPlayed: number;
};

export type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export const leaderboardApi = {
  top50: () => request<LeaderboardResponse>('/api/leaderboard'),
};

// ── Users / Profile ───────────────────────────────────────────────────────────

export type UserProfile = {
  user: {
    id: string;
    username: string;
    chips: number;
    avatarUrl: string | null;
  };
  stats: {
    wins: number;
    handsPlayed: number;
    collectionCount: number;
  };
};

export const usersApi = {
  getProfile: (id: string) => request<UserProfile>(`/api/users/${id}`),
};

// ── Game History ──────────────────────────────────────────────────────────────

export type GameHistoryEntry = {
  id: string;
  roomId: string;
  roundNumber: number;
  winners: { playerId: string; amount: number }[];
  pot: number;
  playerSummary: { id: string; username: string; finalChips: number; status: string }[];
  handDescriptions: Record<string, string>;
  playedAt: string;
};

export const historyApi = {
  list: () => request<{ history: GameHistoryEntry[] }>('/api/history'),
  get: (id: string) => request<GameHistoryEntry>(`/api/history/${id}`),
};
