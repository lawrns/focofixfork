'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Dashboard Settings - DEPRECATED
 * Redirects to /settings (consolidated per Intercom-level UX plan)
 * 
 * Dashboard settings are now part of the main Settings page under Preferences.
 */
export default function DashboardSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Redirecting to Settings...</p>
    </div>
  )
}
