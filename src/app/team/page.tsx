'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Team page - redirects to /people (consolidated per Intercom-level UX plan)
 * /team and /people are now unified into a single People surface
 */
export default function TeamPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/people')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Redirecting to People...</p>
    </div>
  )
}

