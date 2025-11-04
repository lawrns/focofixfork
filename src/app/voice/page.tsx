'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import VoicePlanningWorkbench from '@/components/voice/VoicePlanningWorkbench'

export default function VoicePlanningPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="h-16 w-16 animate-spin text-white relative z-10" />
          </div>
          <p className="text-white/80 mt-6 text-lg">Loading Voice Planning...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <VoicePlanningWorkbench />
}

