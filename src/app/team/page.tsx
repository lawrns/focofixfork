'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'

/**
 * Team page - redirects to organizations page
 * This page exists to handle the /team route from mobile navigation
 */
export default function TeamPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to organizations page
    router.replace('/organizations')
  }, [router])

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to organizations...</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}

