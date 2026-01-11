'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Dashboard Simple - DEPRECATED
 * Redirects to /dashboard (consolidated per Intercom-level UX plan)
 * 
 * The simplified mode is now a toggle/saved view within the main dashboard,
 * not a separate route.
 */
export default function DashboardSimplePage() {
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
