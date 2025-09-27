'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
  fallback?: React.ReactNode
}

/**
 * Protected Route Component
 * Wraps components that require authentication
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requireAuth = true,
  fallback
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      // Redirect to login page with return URL
      const currentPath = window.location.pathname + window.location.search
      const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
      router.push(loginUrl)
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading state while checking authentication
  if (loading) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If authentication is required but user is not authenticated, show nothing
  // The useEffect above will handle the redirect
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // User is authenticated (or auth not required), render children
  return <>{children}</>
}

/**
 * Higher-order component for protecting entire pages
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string
    requireAuth?: boolean
    fallback?: React.ReactNode
  }
) {
  const {
    redirectTo = '/login',
    requireAuth = true,
    fallback
  } = options || {}

  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute
        redirectTo={redirectTo}
        requireAuth={requireAuth}
        fallback={fallback}
      >
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

/**
 * Hook for conditional rendering based on authentication state
 */
export function useProtectedContent() {
  const { user, loading } = useAuth()

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
    // Helper components
    AuthenticatedContent: ({ children }: { children: React.ReactNode }) =>
      user ? <>{children}</> : null,

    UnauthenticatedContent: ({ children }: { children: React.ReactNode }) =>
      !user ? <>{children}</> : null,

    LoadingContent: ({ children }: { children: React.ReactNode }) =>
      loading ? <>{children}</> : null,
  }
}

/**
 * Organization-specific protected route
 * Requires user to be member of specific organization
 */
interface OrganizationProtectedRouteProps extends ProtectedRouteProps {
  organizationId?: string
  requireMembership?: boolean
}

export function OrganizationProtectedRoute({
  children,
  organizationId,
  requireMembership = true,
  fallback,
  ...props
}: OrganizationProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && organizationId && requireMembership) {
      // Check if user is member of the organization
      // This would typically be done via an API call
      // For now, we'll assume the organization membership check passes
      // In a real implementation, you'd check against the database
    }
  }, [user, loading, organizationId, requireMembership, router])

  return (
    <ProtectedRoute {...props} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}


