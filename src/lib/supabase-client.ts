/**
 * Supabase Browser Client - Singleton Instance
 *
 * This is the ONLY Supabase client instance that should be used in client-side code.
 * Always import from this file to ensure a single GoTrueClient instance across the application.
 *
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase-client'
 *
 * // Use for authentication
 * const { data, error } = await supabase.auth.signIn({ email, password })
 *
 * // Use for database queries
 * const { data, error } = await supabase.from('projects').select('*')
 * ```
 *
 * @see {@link https://supabase.com/docs/reference/javascript/initializing}
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './supabase/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use a global variable to ensure true singleton across hot module reloads
// This prevents "Multiple GoTrueClient instances" warnings in development and production
declare global {
  var __supabase: SupabaseClient<Database> | undefined
}

// Create browser client with cookie-based session storage for Next.js App Router
// Use global variable to ensure singleton even with React Strict Mode and HMR
export const supabase = globalThis.__supabase ?? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

if (typeof window !== 'undefined') {
  globalThis.__supabase = supabase
}

// Re-export Database type from types.ts
export type { Database } from './supabase/types'
