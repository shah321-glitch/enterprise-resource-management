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
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://shahlucknow321_db_user:OzK3IX98D7p6tEtn@ac-r6lr13p-shard-00-00.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-01.3g6ejrh.mongodb.net:27017,ac-r6lr13p-shard-00-02.3g6ejrh.mongodb.net:27017/ersms?ssl=true&replicaSet=atlas-hgwona-shard-0&authSource=admin&retryWrites=true&w=majority'),
  JWT_ACCESS_SECRET: z.string().min(16).default('lKDvgSMTO7ilcGhjVhOdlFtNt8LvTSJf'),
  JWT_REFRESH_SECRET: z.string().min(16).default('CLtdfjwqWGghDhCuZAOZYhgEVL6HrzLO'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CRON_ENABLED: z.string().transform((v) => v === 'true').default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const env = parsed.data;
