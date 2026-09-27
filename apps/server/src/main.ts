import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { z } from 'zod';

import { AppModule } from './app.module';

export async function createApplication(): Promise<INestApplication> {
  const application = await NestFactory.create(AppModule, { logger: false });
  application.enableShutdownHooks();
  return application;
}

export function parseServerPort(value: string | undefined): number {
  const parsed = z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65_535))
    .safeParse(value ?? '3001');

  if (!parsed.success) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return parsed.data;
}

async function bootstrap(): Promise<void> {
  const application = await createApplication();
  const port = parseServerPort(process.env.PORT);
  await application.listen(port, '0.0.0.0');
}

if (require.main === module) {
  void bootstrap();
}
