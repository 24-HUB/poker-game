import type { Result } from '@poker/contracts';
import type { z } from 'zod';

export type ApiFetcher = typeof fetch;

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<Result<T>>,
  fetcher: ApiFetcher = fetch,
): Promise<Result<T>> {
  try {
    const response = await fetcher(path, {
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    const parsed = schema.safeParse(await response.json());
    if (parsed.success) return parsed.data;
    return invalidResponse();
  } catch {
    return {
      data: null,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'The server is temporarily unavailable.' },
    };
  }
}

function invalidResponse(): Result<never> {
  return {
    data: null,
    error: { code: 'SERVICE_UNAVAILABLE', message: 'The server returned an invalid response.' },
  };
}
