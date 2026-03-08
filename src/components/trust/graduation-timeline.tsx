'use client'

import { Badge } from '@/components/ui/badge'
import type { AutonomyGraduationLogEntry, AutonomyTier } from '@/lib/trust/types'

interface GraduationTimelineProps {
  graduations: AutonomyGraduationLogEntry[]
}

function tierLabel(tier: AutonomyTier): string {
  switch (tier) {
    case 'off': return 'Off'
    case 'advisor': return 'Advisor'
    case 'bounded': return 'Bounded'
    case 'near_full': return 'Near-Full'
  }
}

function tierBadgeClass(tier: AutonomyTier): string {
  switch (tier) {
    case 'near_full': return 'text-emerald-500 border-emerald-500/30'
    case 'bounded': return 'text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/30'
    case 'advisor': return 'text-amber-500 border-amber-500/30'
    case 'off': return 'text-muted-foreground'
  }
}

function isPromotion(prev: AutonomyTier, next: AutonomyTier): boolean {
  const order: AutonomyTier[] = ['off', 'advisor', 'bounded', 'near_full']
  return order.indexOf(next) > order.indexOf(prev)
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GraduationTimeline({ graduations }: GraduationTimelineProps) {
  if (graduations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No tier changes recorded yet.
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      {graduations.map((entry) => {
        const promoted = isPromotion(entry.previous_tier, entry.new_tier)
        return (
          <div key={entry.id} className="relative flex items-start gap-4 py-3">
            <div className={`relative z-10 mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 ${promoted ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'}`}>
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${promoted ? 'text-emerald-500' : 'text-rose-500'}`}>
                {promoted ? '+' : '-'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={tierBadgeClass(entry.previous_tier)}>
                  {tierLabel(entry.previous_tier)}
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Badge variant="outline" className={tierBadgeClass(entry.new_tier)}>
                  {tierLabel(entry.new_tier)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Score: {Number(entry.trust_score_at_change).toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{entry.trigger_reason}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(entry.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
