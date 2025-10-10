/**
 * @deprecated This file is deprecated and should NOT be used.
 *
 * Import directly from '@/lib/supabase-client' instead.
 *
 * This file has been intentionally left empty (except for this warning) to prevent
 * the bundler from creating multiple Supabase client instances.
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

// This file intentionally left empty to prevent multiple client instances
// All imports should use '@/lib/supabase-client' directly

throw new Error(
  'DEPRECATED: Do not import from "@/lib/supabase". ' +
  'Use "@/lib/supabase-client" instead. ' +
  'See src/lib/supabase.ts for more information.'
)
