/**
 * @deprecated This file is deprecated. Import directly from '@/lib/supabase-client' instead.
 *
 * This re-export file causes multiple Supabase client instances to be created,
 * leading to "Multiple GoTrueClient instances" warnings and potential issues.
 *
 * **DO NOT USE THIS FILE.** Use the canonical import path instead:
 *
 * @example
 * ```typescript
 * // ❌ DEPRECATED - Do not use
 * import { supabase } from '@/lib/supabase'
 *
 * // ✅ CORRECT - Use this instead
 * import { supabase } from '@/lib/supabase-client'
 * ```
 *
 * @see {@link ./supabase-client.ts} for the canonical Supabase client singleton
 */

// Re-export for backward compatibility (DEPRECATED - will be removed in future version)
export * from './supabase-client'

// Runtime warning for developers
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ DEPRECATION WARNING: Importing from "@/lib/supabase" is deprecated.\n' +
    'Please import from "@/lib/supabase-client" instead to avoid multiple client instances.\n' +
    'See src/lib/supabase.ts for more information.'
  )
}
