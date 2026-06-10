import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

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
  DEMO_AGENT_EMAIL: z.string().email(),
  DEMO_AGENT_PASSWORD: z.string().min(6),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
