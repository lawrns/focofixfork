import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Only process API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip auth endpoints and health checks
  if (
    request.nextUrl.pathname.startsWith('/api/auth/') ||
    request.nextUrl.pathname === '/api/health' ||
    request.nextUrl.pathname === '/api/ai/health'
  ) {
    return NextResponse.next()
  }

  try {
    let supabaseResponse = NextResponse.next()

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Get the current user from the session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('[Middleware] No authenticated user found')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Clone the request headers and add x-user-id
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)

    // Create a new response with the modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Copy any cookie changes from Supabase
    supabaseResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie)
    })

    return response
  } catch (error) {
    console.error('[Middleware] Error processing request:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: '/api/:path*',
}
