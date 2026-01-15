import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  supabase: SupabaseClient
  error: string | null
  response?: NextResponse
}

/**
 * Get authenticated user from request
 * Creates Supabase server client with proper cookie handling from request
 *
 * IMPORTANT: Always use the returned response object to ensure token refresh
 * cookies are properly propagated to the client. This prevents 401 errors
 * after token refresh.
 *
 * Example:
 * ```typescript
 * const { user, supabase, error, response } = await getAuthUser(req)
 * if (error || !user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 *
 * // Use response if you need to set additional cookies
 * const res = NextResponse.json({ data: ... })
 * response?.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c.options))
 * return res
 * ```
 */
export async function getAuthUser(req: NextRequest): Promise<AuthResult> {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // First try getUser() which validates the JWT from cookies
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // If getUser fails, log the error for debugging
  if (error) {
    console.error('[Auth] getUser error:', error.message)
    return { user: null, supabase, error: error.message, response }
  }
  
  if (!user) {
    console.error('[Auth] No user found in session')
    return { user: null, supabase, error: 'No user in session', response }
  }

  return { user, supabase, error: null, response }
}

/**
 * Merge auth response cookies into a new response
 * This ensures token refresh cookies are propagated after API calls
 *
 * Usage:
 * ```typescript
 * const { user, error, response: authResponse } = await getAuthUser(req)
 * if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *
 * const jsonRes = NextResponse.json({ data: ... })
 * return mergeAuthResponse(jsonRes, authResponse)
 * ```
 */
export function mergeAuthResponse(jsonResponse: NextResponse, authResponse?: NextResponse): NextResponse {
  if (!authResponse) return jsonResponse

  authResponse.cookies.getAll().forEach(cookie => {
    jsonResponse.cookies.set(cookie.name, cookie.value)
  })

  return jsonResponse
}
