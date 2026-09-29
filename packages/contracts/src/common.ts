import { z } from 'zod';

export type AppError = {
  code: string;
  message: string;
};

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };

export function resultSchema<T extends z.ZodType>(dataSchema: T) {
  const appErrorSchema = z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .strict();

  return z.union([
    z.object({ data: dataSchema, error: z.null() }).strict(),
    z.object({ data: z.null(), error: appErrorSchema }).strict(),
  ]);
}
