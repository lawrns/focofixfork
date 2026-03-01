'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react'
import type { MissionStep } from '@/lib/command-center/types'

interface MissionTimelineProps {
  steps: MissionStep[]
}

export function MissionTimeline({ steps }: MissionTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No steps recorded</p>
    )
  }

  return (
    <ol className="relative space-y-4 pl-6 border-l border-border">
      {steps.map((step, i) => {
        const Icon =
          step.status === 'done'    ? CheckCircle2 :
          step.status === 'failed'  ? XCircle      :
          step.status === 'running' ? Loader2       : Circle

        const iconColor =
          step.status === 'done'    ? 'text-emerald-500' :
          step.status === 'failed'  ? 'text-rose-500'    :
          step.status === 'running' ? 'text-teal-500'    : 'text-muted-foreground'

        return (
          <li key={step.id} className="relative flex gap-3">
            <span className="absolute -left-[1.65rem] top-0.5">
              <Icon className={cn('h-4 w-4 bg-background', iconColor, step.status === 'running' && 'animate-spin')} />
            </span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', step.status === 'failed' && 'text-rose-500')}>
                {i + 1}. {step.label}
              </p>
              {step.output && (
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5 line-clamp-3">
                  {step.output}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
