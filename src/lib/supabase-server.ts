import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

// Detect if we're running in the browser
const isBrowser = typeof window !== 'undefined'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
// A real Supabase JWT always starts with "eyJ". Placeholder values (e.g.
// PLACEHOLDER_NEED_SERVICE_ROLE_KEY) are not valid JWTs — treat them as absent.
const supabaseServiceKey = (rawServiceKey && rawServiceKey.startsWith('eyJ'))
  ? rawServiceKey
  : undefined

// Browser environment: Return null to prevent client-side usage
// This prevents crashes when client-side code imports services that use supabaseAdmin
let supabaseAdmin: any = null

if (isBrowser) {
  supabaseAdmin = null
} else {
  if (!supabaseUrl) {
    // Hard failure — URL is always required
    throw new Error(
      'Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please set this in your .env.local file or deployment environment.'
    )
  }

  if (!supabaseServiceKey) {
    // Soft failure — routes that need admin access will check for null and fall
    // back to the user-scoped client where possible.
    logger.debug('SUPABASE_SERVICE_ROLE_KEY is absent or invalid — supabaseAdmin will be null, routes will use user-scoped client with RLS' as any)
  } else {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Server-side env check', {
        SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT_SET',
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'NOT_SET'
      } as any)
    }

    // Server-side client that bypasses RLS for authenticated API routes
    supabaseAdmin = createClient(
      supabaseUrl!,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
}

export { supabaseAdmin }
