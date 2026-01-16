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

    // Get authenticated user - MUST use getUser() not getSession()
    // getSession() only works client-side, server-side it returns null
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('[UserSetup] getUser failed:', authError?.message)
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        ),
        completed: false
      }
    }

    // Check if user is member of any workspace (this is the new setup check)
    // The user_profiles table doesn't have organization_id column
    // Instead, check workspace_members table
    const { data: membership, error } = await supabaseClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[UserSetup] workspace membership check failed:', error.message)
      // If there's an error, allow through (don't block on setup check failure)
      return { completed: true }
    }

    // If user is member of any workspace, setup is completed
    const hasCompletedSetup = membership !== null

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
