import 'dotenv/config';
import { z } from 'zod';

const DEV_SECRET = 'dev-secret-change-me-in-production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/travel_memories'),
  JWT_SECRET: z.string().min(16).default(DEV_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  PUBLIC_URL: z.string().default('http://localhost:8000'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(5 * 1024 * 1024),
  STORAGE_LIMIT_BYTES: z.coerce.number().default(10 * 1024 * 1024 * 1024),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  AUTO_MIGRATE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export const config = schema.parse(process.env);

if (config.NODE_ENV === 'production' && config.JWT_SECRET === DEV_SECRET) {
  throw new Error('JWT_SECRET doit être défini en production');
}

export const isTest = config.NODE_ENV === 'test';