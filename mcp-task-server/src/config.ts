import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_USER_ID: z.string().uuid().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_USER_ID: process.env.ADMIN_USER_ID,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  });

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const CONFIG = loadConfig();
