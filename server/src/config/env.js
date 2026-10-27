import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ersms'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development_access_secret_key_minimum_16_chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development_refresh_secret_key_minimum_16_chars'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(300),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CRON_ENABLED: z.string().transform((v) => v === 'true').default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const env = parsed.data;
