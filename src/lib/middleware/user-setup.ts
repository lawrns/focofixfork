import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware to check if user has completed organization setup
 * Redirects to organization setup page if not completed
 */
export async function userSetupMiddleware(
  req: NextRequest
): Promise<{ completed: boolean; error?: NextResponse }> {
  try {
    const supabaseClient = createServerClient(
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
          setAll() {
            // Read-only in middleware
          },
        },
      }
    )

    // Get authenticated user
    const { data: { session } } = await supabaseClient.auth.getSession()

    if (!session) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        ),
        completed: false
      }
    }

    // Check if user has completed organization setup
    const { data: profile, error } = await supabaseClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single()

    if (error) {
      // If profile doesn't exist or there's an error, user hasn't completed setup
      return { completed: false }
    }

    // If organization_id exists and is not null, setup is completed
    const hasCompletedSetup = profile && profile.organization_id !== null

    return { completed: hasCompletedSetup }
  } catch (error) {
    console.error('User setup middleware error:', error)
    return {
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      completed: false
    }
  }
}

/**
 * Redirect to organization setup if user hasn't completed setup
 */
export function redirectToSetupIfNeeded(req: NextRequest, hasCompletedSetup: boolean): NextResponse | null {
  const pathname = req.nextUrl.pathname

  // Don't redirect if already on setup page or auth pages
  if (pathname === '/organization-setup' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/api/')) {
    return null
  }

  if (!hasCompletedSetup) {
    const setupUrl = new URL('/organization-setup', req.url)
    return NextResponse.redirect(setupUrl)
  }

  return null
}
