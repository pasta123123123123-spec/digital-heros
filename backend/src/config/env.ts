import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Fail fast at boot if config is missing/malformed, rather than surfacing
// cryptic runtime errors later (e.g. "Cannot read property of undefined"
// three requests into a demo).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PRICE_ID_MONTHLY: z.string().min(1),
  STRIPE_PRICE_ID_YEARLY: z.string().min(1),

  UPLOAD_DIR: z.string().default('uploads'),

  DRAW_TICKET_NUMBER_RANGE: z.coerce.number().default(49),
  DRAW_TICKET_LENGTH: z.coerce.number().default(5),
  PRIZE_POOL_CONTRIBUTION_PCT: z.coerce.number().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
