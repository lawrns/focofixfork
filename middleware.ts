import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userSetupMiddleware, redirectToSetupIfNeeded } from '@/lib/middleware/user-setup'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Create Supabase client
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
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // First try to get existing session
  let { data: { session }, error } = await supabase.auth.getSession()

  // If no session or session is expired, try to refresh
  if (!session || (session.expires_at && new Date(session.expires_at).getTime() < Date.now())) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshError && refreshData.session) {
      session = refreshData.session
    }
  }

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/tasks',
    '/milestones',
    '/organizations',
    '/settings',
    '/profile'
  ]

  // Define auth routes that should redirect to dashboard if already authenticated
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ]

  const { pathname } = req.nextUrl

  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if current route is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Handle protected routes
  if (isProtectedRoute) {
    if (!session) {
      // Redirect to login with return URL
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user has completed organization setup
    const setupResult = await userSetupMiddleware(req)
    if (setupResult.error) {
      return setupResult.error
    }

    // Redirect to organization setup if not completed
    const redirectResponse = redirectToSetupIfNeeded(req, setupResult.completed)
    if (redirectResponse) {
      return redirectResponse
    }
  }

  // Handle auth routes - redirect authenticated users appropriately
  if (isAuthRoute && session) {
    // Check if user has completed organization setup
    const setupResult = await userSetupMiddleware(req)
    if (setupResult.error) {
      return setupResult.error
    }

    if (setupResult.completed) {
      // User has completed setup, redirect to dashboard or requested page
      const redirectTo = req.nextUrl.searchParams.get('redirect') || '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, req.url))
    } else {
      // User hasn't completed setup, redirect to organization setup
      return NextResponse.redirect(new URL('/organization-setup', req.url))
    }
  }

  // API route protection
  if (pathname.startsWith('/api/')) {
    console.log('Middleware: API route detected:', pathname, 'Session:', session ? `present (user: ${session.user.id})` : 'null')

    // Allow auth endpoints without authentication
    if (pathname.startsWith('/api/auth/')) {
      return res
    }

    // Allow organization setup endpoint without organization setup completion
    if (pathname === '/api/organization-setup') {
      // Still require authentication
      if (!session) {
        console.log('Middleware: No session for organization setup API, returning 401')
        return NextResponse.json(
          {
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        )
      }
      // Allow the organization setup API even if setup isn't complete
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', session.user.id)
      requestHeaders.set('x-user-email', session.user.email || '')
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    // Check for valid session on protected API routes
    if (!session) {
      console.log('Middleware: No session for API route, returning 401')
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          path: pathname
        },
        { status: 401 }
      )
    }

    // Check organization setup completion for protected API routes
    const setupResult = await userSetupMiddleware(req)
    if (setupResult.error) {
      console.error('Middleware: Setup check error:', setupResult.error)
      return setupResult.error
    }

    if (!setupResult.completed) {
      console.log('Middleware: User has not completed organization setup, blocking API access')
      return NextResponse.json(
        {
          error: 'Organization setup required',
          code: 'SETUP_REQUIRED'
        },
        { status: 403 }
      )
    }

    console.log(`Middleware: Setting headers for API route ${pathname} - userId: ${session.user.id}, email: ${session.user.email}`)

    // Add user context to request headers for API routes
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', session.user.id)
    requestHeaders.set('x-user-email', session.user.email || '')
    requestHeaders.set('x-session-expires', session.expires_at ? String(session.expires_at) : '')

    // Verify headers are set
    const headersSet = {
      'x-user-id': requestHeaders.get('x-user-id'),
      'x-user-email': requestHeaders.get('x-user-email')
    }
    console.log('Middleware: Headers set for API:', headersSet)

    // Create new request with modified headers
    const modifiedRequest = new NextRequest(req.url, {
      headers: requestHeaders,
      method: req.method,
      body: req.body,
    })

    // Return response with modified request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Organization context middleware for certain routes
  if (pathname.startsWith('/projects/') || pathname.startsWith('/organizations/')) {
    // This will be handled by the organization context middleware
    // For now, just pass through
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
