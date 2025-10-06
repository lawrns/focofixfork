// Debug: Check if this file is loaded
console.log('🔧 Supabase client file loaded');

import { createBrowserClient } from '@supabase/ssr'
import { Database } from './supabase/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug logging
console.log('🔧 Supabase Client Init:', {
  url: supabaseUrl ? 'SET' : 'NOT SET',
  key: supabaseAnonKey ? 'SET' : 'NOT SET',
  urlValue: supabaseUrl,
  keyLength: supabaseAnonKey?.length
})

// Create browser client with cookie-based session storage for Next.js App Router
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Re-export Database type from types.ts
export type { Database } from './supabase/types'
