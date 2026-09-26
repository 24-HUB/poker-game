import { describe, expect, it } from 'vitest';

import { resultSchema } from './common.js';
import { z } from 'zod';

describe('resultSchema', () => {
  it('rejectsBothResultBranches', () => {
    const parsed = resultSchema(z.object({})).safeParse({
      data: {},
      error: { code: 'X', message: 'x' },
    });

    expect(parsed.success).toBe(false);
  });
});
