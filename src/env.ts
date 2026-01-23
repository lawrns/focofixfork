import { z } from 'zod'

const envSchema = z.object({
  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().optional(),

  // Upstash Redis (optional - for circuit breaker and rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // AI Providers (optional)
  OPENAI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_OPENAI_MODEL: z.string().optional(),
  NEXT_PUBLIC_OPENAI_CHAT_MODEL: z.string().optional(),

  // GLM (Z.AI) Provider
  GLM_API_KEY: z.string().optional(),
  GLM_MODEL: z.string().optional(),

  // DeepSeek Provider
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'deepseek', 'glm']).optional(),

  NEXT_PUBLIC_OLLAMA_URL: z.string().url().optional(),
  NEXT_PUBLIC_OLLAMA_DEFAULT_MODEL: z.string().optional(),
  NEXT_PUBLIC_OLLAMA_CHAT_MODEL: z.string().optional(),
  NEXT_PUBLIC_OLLAMA_CODE_MODEL: z.string().optional(),
  OLLAMA_ENABLED: z.string().optional(),
  NEXT_PUBLIC_AI_PROVIDER: z.enum(['openai', 'ollama']).optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NODE_VERSION: z.string().optional(),

  // Telemetry
  NEXT_TELEMETRY_DISABLED: z.string().optional(),
})

// Parse and validate environment variables
export const env = envSchema.parse(process.env)

// Type for environment variables
export type Env = z.infer<typeof envSchema>
