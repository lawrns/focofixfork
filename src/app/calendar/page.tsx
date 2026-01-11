'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Calendar page - DEPRECATED
 * Redirects to /timeline (consolidated per Intercom-level UX plan)
 * 
 * Calendar is now a view mode toggle within Timeline, not a separate route.
 * Use /timeline?view=calendar for calendar view.
 */
export default function CalendarPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/timeline')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Redirecting to Timeline...</p>
    </div>
  )
}
