import { createClient } from '@supabase/supabase-js'

// Detect if we're running in the browser
const isBrowser = typeof window !== 'undefined'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Browser environment: Return null to prevent client-side usage
// This prevents crashes when client-side code imports services that use supabaseAdmin
let supabaseAdmin: any = null

if (isBrowser) {
  console.warn(
    '⚠️ supabase-server.ts is being imported in the browser. ' +
    'This should only be used in server-side code (API routes, server components). ' +
    'Client-side code should use supabase-client.ts instead.'
  )
  
  // Set to null for browser environment to prevent usage
  supabaseAdmin = null
} else {
  // Server environment: Validate required environment variables
  if (!supabaseServiceKey) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. ' +
      'Please set this in your .env.local file or deployment environment.'
    )
  }

  // Debug logging (server-side only)
  console.log('🌍 Server-side env check:', {
    SUPABASE_URL: supabaseUrl ? '✅ SET' : '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? '✅ SET' : '❌ NOT SET'
  })

  // Server-side client that bypasses RLS for authenticated API routes
  supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export { supabaseAdmin }
