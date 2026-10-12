import { currentRoomSchema, resultSchema, type CurrentRoom, type Result } from '@poker/contracts';
import { apiGet, type ApiFetcher } from './api';

export const currentRoomKey = (accountId: string | null) => ['current-room', accountId] as const;

export async function readCurrentRoom(fetcher: ApiFetcher = fetch): Promise<Result<CurrentRoom | null>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    return await apiGet('/api/rooms/current', resultSchema(currentRoomSchema.nullable()),
      (path, options) => fetcher(path, { ...options, signal: controller.signal }));
  } finally { clearTimeout(timeout); }
}
