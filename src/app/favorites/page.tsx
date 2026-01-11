'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Favorites page - DEPRECATED
 * Redirects to /my-work (consolidated per Intercom-level UX plan)
 * 
 * Favorites is now a filter/view within My Work, not a separate page.
 */
export default function FavoritesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/my-work')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Redirecting to My Work...</p>
    </div>
  )
}
