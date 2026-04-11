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

  me: () => request<{ user: AuthUser }>('/api/auth/me'),
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

export type CollectionResponse = { items: GachaItem[] };

export const collectionApi = {
  list: () => request<CollectionResponse>('/api/collection'),
};
