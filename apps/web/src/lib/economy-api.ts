import type { Result } from '@poker/contracts';
import type { z } from 'zod';

export async function economyMutation<T>(path: string, method: 'POST' | 'PUT', input: object,
  schema: z.ZodType<Result<T>>, fetcher: typeof fetch = fetch): Promise<Result<T>> {
  try {
    const response = await fetcher(path, { method, credentials: 'include', cache: 'no-store',
      headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const parsed = schema.safeParse(await response.json());
    if (parsed.success) return parsed.data;
  } catch { /* An interrupted response cannot establish whether a durable mutation committed. */ }
  return { data: null, error: { code: 'COMMAND_UNCERTAIN', message: 'The response was interrupted. Recover the existing request before trying another.' } };
}
