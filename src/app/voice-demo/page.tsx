'use client'

import dynamic from 'next/dynamic'

// Dynamic import for VoicePlanningWorkbench - reduces bundle by ~5.6MB
const VoicePlanningWorkbench = dynamic(() => import('@/features/voice/components/VoicePlanningWorkbench'), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading voice interface...</div>,
  ssr: false
})

export default function VoiceDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <VoicePlanningWorkbench />
    </div>
  )
}
