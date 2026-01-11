'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Docs page - DEPRECATED
 * Redirects to /help (consolidated per Intercom-level UX plan)
 * 
 * Docs, Help, and Instructions are now unified into a single Help Center at /help
 */
export default function DocsPage() {
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
