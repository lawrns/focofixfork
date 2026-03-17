import { Suspense } from 'react'
import { OperatorPulsePanel } from '@/components/openclaw/operator-pulse-panel'

export const metadata = {
  title: 'Operator Pulse — OpenClaw',
  description: 'Real-time operator surface for OpenClaw gateway, cron jobs, and workspace health.',
}

export default function OperatorPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center text-zinc-600 text-sm font-mono">
        loading operator pulse...
      </div>
    }>
      <OperatorPulsePanel />
    </Suspense>
  )
}
