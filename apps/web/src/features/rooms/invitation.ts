export function readInvitationFragment(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const token = new URLSearchParams(hash.slice(1)).get('invite')?.trim();
  return token ? token : null;
}

const pendingInvitationKey = 'poker.pending-invitation';
const pendingInvitationLifetimeMs = 15 * 60_000;

export function storePendingInvitation(token: string, storage: Storage, capturedAt = Date.now()): void {
  storage.setItem(pendingInvitationKey, JSON.stringify({ token, capturedAt }));
}

export function readPendingInvitation(storage: Storage, now = Date.now()): string | null {
  const value = storage.getItem(pendingInvitationKey);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isPendingInvitation(parsed) || now - parsed.capturedAt >= pendingInvitationLifetimeMs) {
      storage.removeItem(pendingInvitationKey);
      return null;
    }
    return parsed.token;
  } catch {
    storage.removeItem(pendingInvitationKey);
    return null;
  }
}

export function clearPendingInvitation(storage: Storage): void {
  storage.removeItem(pendingInvitationKey);
}

function isPendingInvitation(value: unknown): value is { token: string; capturedAt: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.token === 'string'
    && candidate.token.length > 0
    && typeof candidate.capturedAt === 'number'
    && Number.isFinite(candidate.capturedAt);
}
