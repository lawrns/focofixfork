import { createServerClient } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { userSetupMiddleware, redirectToSetupIfNeeded } from '@/lib/middleware/user-setup'

export async function middleware(req: NextRequest) {
  // Generate correlation ID
  const correlationId = req.headers.get('x-correlation-id') ?? nanoid()

  // Create base response
  const res = NextResponse.next()

  // Add correlation ID to response
  res.headers.set('x-correlation-id', correlationId)

  // Add security headers
  res.headers.set('x-frame-options', 'DENY')
  res.headers.set('x-content-type-options', 'nosniff')
  res.headers.set('referrer-policy', 'no-referrer')
  res.headers.set('permissions-policy', 'geolocation=(),camera=(),microphone=()')

  // Content Security Policy
  res.headers.set(
    'content-security-policy',
    "default-src 'self'; " +
    "img-src 'self' data: https:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "connect-src 'self' https://*.supabase.co https://api.openai.com; " +
    "font-src 'self' data:; " +
    "frame-ancestors 'none';"
  )

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

  // Get user from cookies (NOT getSession which uses memory)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Build session object if user exists
  let session = null
  if (user && !authError) {
    // User is authenticated, create minimal session object
    session = { user }
  }

  const { pathname } = req.nextUrl

  // Protected page routes
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/tasks',
    '/milestones',
    '/organizations',
    '/settings',
    '/profile',
    '/instructions',
    '/runs',
    '/crons',
    '/emails',
    '/artifacts',
    '/ledger',
    '/policies',
    '/inbox',
    '/my-work',
    '/people',
    '/reports',
    '/timeline',
    '/proposals',
    '/search',
    '/favorites',
    '/openclaw',
  ]

  // Public routes (accessible without authentication)
  const publicRoutes = [
    '/mermaid',
    '/mermaid/new',
    '/mermaid/share',
    '/docs',
    '/help'
  ]

  // Auth routes (login, register, etc.)
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Handle protected page routes
  if (isProtectedRoute) {
    if (!session) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const setupResult = await userSetupMiddleware(req)
    if (setupResult.error) {
      return setupResult.error
    }

    const redirectResponse = redirectToSetupIfNeeded(req, setupResult.completed)
    if (redirectResponse) {
      return redirectResponse
    }
  }

  // Handle auth routes
  if (isAuthRoute && session) {
    const setupResult = await userSetupMiddleware(req)
    if (setupResult.error) {
      return setupResult.error
    }

    if (setupResult.completed) {
      const redirectTo = req.nextUrl.searchParams.get('redirect') || '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, req.url))
    } else {
      return NextResponse.redirect(new URL('/organization-setup', req.url))
    }
  }

  // API route handling - NO MORE x-user-id HEADERS
  // Authentication is now handled by requireAuth() in each route handler
  if (pathname.startsWith('/api/')) {
    // Allow public API endpoints
    if (
      pathname.startsWith('/api/auth/') ||
      pathname === '/api/health' ||
      (pathname === '/api/openclaw/status' && process.env.FOCO_DB === 'sqlite') ||
      pathname.startsWith('/api/invitations/') && pathname.includes('/accept') ||
      pathname.startsWith('/api/mermaid/share/') ||
      (pathname.startsWith('/api/mermaid/diagrams') && req.method === 'POST')
    ) {
      return res
    }

    // For organization setup and organizations API, check auth but allow incomplete setup
    if (pathname === '/api/organization-setup' || pathname === '/api/organizations') {
      if (!session) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTH_REQUIRED',
              message: 'Authentication required'
            }
          },
          {
            status: 401,
            headers: { 'x-correlation-id': correlationId }
          }
        )
      }
      return res
    }

    // All other API routes: check auth
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required'
          }
        },
        {
          status: 401,
          headers: { 'x-correlation-id': correlationId }
        }
      )
    }

    // Check organization setup completion
    const setupResult = await userSetupMiddleware(req)
    if (setupResult.error) {
      return setupResult.error
    }

    if (!setupResult.completed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SETUP_REQUIRED',
            message: 'Organization setup required'
          }
        },
        {
          status: 403,
          headers: { 'x-correlation-id': correlationId }
        }
      )
    }

    // Continue to route handler (which will use requireAuth() to get user from session)
    return res
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
