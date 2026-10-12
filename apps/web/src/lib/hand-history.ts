import { handHistorySchema, resultSchema, type HandHistoryPage, type Result } from '@poker/contracts';
import { apiGet } from './api';
export async function readHandHistory(roomId: string, sessionId: string, before?: number, fetcher: typeof fetch = fetch): Promise<Result<HandHistoryPage>> {
  const query = new URLSearchParams({ sessionId });
  if (before !== undefined) query.set('beforeHandNumber', String(before));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    return await apiGet(`/api/rooms/${encodeURIComponent(roomId)}/hands?${query}`, resultSchema(handHistorySchema),
      (path, options) => fetcher(path, { ...options, signal: controller.signal }));
  } finally { clearTimeout(timeout); }
}
