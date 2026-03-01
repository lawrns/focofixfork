import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

// Detect if we're running in the browser
const isBrowser = typeof window !== 'undefined'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Browser environment: Return null to prevent client-side usage
// This prevents crashes when client-side code imports services that use supabaseAdmin
let supabaseAdmin: any = null

if (isBrowser) {
  supabaseAdmin = null
} else {
  // Server environment: Validate required environment variables
  if (!supabaseUrl) {
    throw new Error(
      'Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. ' +
      'Please set this in your .env.local file or deployment environment.'
    )
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. ' +
      'Please set this in your .env.local file or deployment environment.'
    )
  }

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

export { supabaseAdmin }
