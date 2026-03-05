'use client'

import { Badge } from '@/components/ui/badge'
import { Flag, X } from 'lucide-react'

type StrategicBannerProps = {
  visible: boolean
  onDismiss: () => void
}

export function StrategicBanner({ visible, onDismiss }: StrategicBannerProps) {
  if (!visible) return null

  return (
    <div className="rounded-lg border-l-4 border-l-amber-500 border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag className="h-3.5 w-3.5 text-amber-500" />
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0">
            G1 Absolute Priority
          </Badge>
          Strategic rule active: prioritize customer-facing execution over platform churn.
        </div>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss strategic rule"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
