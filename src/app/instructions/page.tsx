'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Instructions page - DEPRECATED
 * Redirects to /help (consolidated per Intercom-level UX plan)
 * 
 * Instructions content is now contextual onboarding (coach marks + checklist),
 * not a standalone page.
 */
export default function InstructionsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/help')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Redirecting to Help Center...</p>
    </div>
  )
}
