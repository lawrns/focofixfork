import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mEyclO8MnvfQ8'

// Debug logging
console.log('🌍 Server-side env check:', {
  SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
  SUPABASE_KEY: supabaseServiceKey ? 'SET' : 'NOT SET'
})

// Server-side client that bypasses RLS for authenticated API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
