import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from cwd first, then fallback to server/.env and root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z
    .preprocess((val) => {
      if (typeof val !== 'string') return 'development';
      const clean = val.trim().toLowerCase();
      if (clean === 'production' || clean === 'prod') return 'production';
      if (clean === 'test') return 'test';
      return 'development';
    }, z.enum(['development', 'production', 'test']))
    .default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z
    .string()
    .optional()
    .transform(
      (v) =>
        v?.trim() ||
        'mongodb://shahlucknow321_db_user:OzK3IX98D7p6tEtn@ac-r6lr13p-shard-00-00.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-01.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-02.3g6ejrh.mongodb.net:27017/ersms?ssl=true&replicaSet=atlas-hgwona-shard-0&authSource=admin&retryWrites=true&w=majority'
    ),
  JWT_ACCESS_SECRET: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length >= 16 ? v.trim() : 'lKDvgSMTO7ilcGhjVhOdlFtNt8LvTSJf')),
  JWT_REFRESH_SECRET: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length >= 16 ? v.trim() : 'CLtdfjwqWGghDhCuZAOZYhgEVL6HrzLO')),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  LOG_LEVEL: z
    .preprocess((val) => {
      if (typeof val !== 'string') return 'info';
      const clean = val.trim().toLowerCase();
      const valid = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
      return valid.includes(clean) ? clean : 'info';
    }, z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']))
    .default('info'),
  CRON_ENABLED: z
    .preprocess((v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
      return true;
    }, z.boolean())
    .default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('Environment variable warning, using safe fallback defaults:', parsed.error.format());
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: process.env.NODE_ENV?.toLowerCase().includes('prod') ? 'production' : 'development',
      PORT: Number(process.env.PORT) || 5000,
      MONGODB_URI:
        process.env.MONGODB_URI?.trim() ||
        'mongodb://shahlucknow321_db_user:OzK3IX98D7p6tEtn@ac-r6lr13p-shard-00-00.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-01.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-02.3g6ejrh.mongodb.net:27017/ersms?ssl=true&replicaSet=atlas-hgwona-shard-0&authSource=admin&retryWrites=true&w=majority',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET?.trim() || 'lKDvgSMTO7ilcGhjVhOdlFtNt8LvTSJf',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET?.trim() || 'CLtdfjwqWGghDhCuZAOZYhgEVL6HrzLO',
      JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
      JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
      LOG_LEVEL: 'info',
      CRON_ENABLED: process.env.CRON_ENABLED !== 'false',
    };
