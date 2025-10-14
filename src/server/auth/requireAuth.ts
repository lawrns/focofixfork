import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/env'

export class AuthError extends Error {
  code: string
  statusCode: number

  constructor(code: string, message: string, statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Authentication required') {
    super('AUTH_REQUIRED', message, 401)
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Access denied') {
    super('ACCESS_DENIED', message, 403)
  }
}

/**
 * Get authenticated user from Supabase session
 * Throws UnauthorizedError if not authenticated
 */
export async function requireAuth() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Cookie setting may fail in middleware
          }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('Authentication required')
  }

  return {
    id: user.id,
    email: user.email,
    supabase // Return supabase client for data access with user's JWT
  }
}

/**
 * Get authenticated user or null if not authenticated
 * Does not throw, returns null instead
 */
export async function getAuthUser() {
  try {
    return await requireAuth()
  } catch {
    return null
  }
}
