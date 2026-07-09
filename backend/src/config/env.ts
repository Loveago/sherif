import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load backend/.env even when process is started from the monorepo root
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config(); // fallback to CWD .env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url(),
  MOCK_PAYMENTS: z.string().default('true').transform((value) => value === 'true'),
  MOCK_PROVIDER: z.string().default('true').transform((value) => value === 'true'),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(6),
  DEMO_AGENT_EMAIL: z.string().email().default('agent@cheappacksgh.com'),
  DEMO_AGENT_PASSWORD: z.string().min(6).default('Agent@123'),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  SHANK_API_KEY: z.string().optional(),
  SHANK_API_BASE_URL: z.string().url().default('https://agent.skanka5.com/api/v1'),
  SHANK_WORKER_INTERVAL_MS: z.coerce.number().default(30000),
  CODECRAFT_API_KEY: z.string().optional(),
  CODECRAFT_API_BASE_URL: z.string().url().default('https://api.codecraftnetwork.com/api'),
  CODECRAFT_WORKER_INTERVAL_MS: z.coerce.number().default(30000),
});

export const env = envSchema.parse(process.env);
