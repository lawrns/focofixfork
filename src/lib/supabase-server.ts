import { createClient } from '@supabase/supabase-js'

// Detect if we're running in the browser
const isBrowser = typeof window !== 'undefined'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Browser environment: Skip validation and create a dummy client
// This prevents crashes when client-side code imports services that use supabaseAdmin
if (isBrowser) {
  console.warn(
    '⚠️ supabase-server.ts is being imported in the browser. ' +
    'This should only be used in server-side code (API routes, server components). ' +
    'Client-side code should use supabase-client.ts instead.'
  )
}

// Server environment: Validate required environment variables
if (!isBrowser && !supabaseServiceKey) {
  throw new Error(
    'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. ' +
    'Please set this in your .env.local file or deployment environment.'
  )
}

// Debug logging (server-side only)
if (!isBrowser) {
  console.log('🌍 Server-side env check:', {
    SUPABASE_URL: supabaseUrl ? '✅ SET' : '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? '✅ SET' : '❌ NOT SET'
  })
}

// Server-side client that bypasses RLS for authenticated API routes
// In browser, this will be a client with the anon key (services shouldn't be called from browser anyway)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
