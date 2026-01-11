'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Dashboard Goals - DEPRECATED
 * Redirects to /dashboard (consolidated per Intercom-level UX plan)
 * 
 * Goals is now a tab within the main dashboard, or embedded in Projects as milestones.
 */
export default function DashboardGoalsPage() {
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
