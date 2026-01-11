'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Dashboard Personalized - DEPRECATED
 * Redirects to /dashboard (consolidated per Intercom-level UX plan)
 * 
 * Personalized view is now a saved view/toggle within the main dashboard.
 */
export default function PersonalizedDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Redirecting to Dashboard...</p>
    </div>
  )
}
