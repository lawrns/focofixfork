import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
  }

  // Handle auth routes - redirect authenticated users to dashboard
  if (isAuthRoute && session) {
    const redirectTo = req.nextUrl.searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, req.url))
  }

  // API route protection
  if (pathname.startsWith('/api/')) {
    // Allow auth endpoints without authentication
    if (pathname.startsWith('/api/auth/')) {
      return res
    }

    // Check for valid session on protected API routes
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limiting for API routes (basic implementation)
    const clientIP = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     'unknown'

    // In a real implementation, you'd check rate limits against Redis/database
    // For now, we'll just pass through

    // Add user context to request headers for API routes
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', session.user.id)
    requestHeaders.set('x-user-email', session.user.email || '')

    // Return response with modified headers
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
