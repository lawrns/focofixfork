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
export const supabase = globalThis.__supabase ?? createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return []
        const cookies: { name: string; value: string }[] = []
        document.cookie.split(';').forEach(cookie => {
          const trimmed = cookie.trim()
          const eqIndex = trimmed.indexOf('=')
          if (eqIndex === -1) return
          const name = trimmed.slice(0, eqIndex)
          const value = trimmed.slice(eqIndex + 1)
          if (name && value) {
            cookies.push({ name: decodeURIComponent(name), value: decodeURIComponent(value) })
          }
        })
        return cookies
      },
      setAll(cookies) {
        if (typeof document === 'undefined') return
        cookies.forEach(({ name, value, options }) => {
          const cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${options?.maxAge || 31536000}; ${options?.secure ? 'secure;' : ''} ${options?.sameSite ? `samesite=${options.sameSite};` : ''}`
          document.cookie = cookieString
        })
      },
    },
  }
)

if (typeof window !== 'undefined') {
  globalThis.__supabase = supabase
}

// Re-export Database type from types.ts
export type { Database } from './supabase/types'
