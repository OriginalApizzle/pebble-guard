import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DISCORD_TOKEN: z.string().min(1, 'Discord token is required'),
    DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is required'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    BOT_API_SECRET: z.string().default('dev-secret'),
    ENCRYPTION_KEY: z.string().default('0000000000000000000000000000000000000000000000000000000000000000'),
    DASHBOARD_URL: z.string().default('http://localhost:3000'),
  },
  runtimeEnv: process.env,
});
