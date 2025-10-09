import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Debug logging
console.log('🌍 Server-side env check:', {
  SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
  SUPABASE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET'
})

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!')
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations')
}

// Server-side client that bypasses RLS for authenticated API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
