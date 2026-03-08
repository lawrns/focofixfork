'use client'

import { cn } from '@/lib/utils'
import type { AutonomyTier } from '@/lib/trust/types'

interface TrustScoreGaugeProps {
  score: number
  tier: AutonomyTier
  size?: 'sm' | 'md' | 'lg'
}

function tierColor(tier: AutonomyTier): string {
  switch (tier) {
    case 'near_full': return 'text-emerald-500'
    case 'bounded': return 'text-[color:var(--foco-teal)]'
    case 'advisor': return 'text-amber-500'
    case 'off': return 'text-muted-foreground'
  }
}

function strokeColor(tier: AutonomyTier): string {
  switch (tier) {
    case 'near_full': return 'stroke-emerald-500'
    case 'bounded': return 'stroke-[color:var(--foco-teal)]'
    case 'advisor': return 'stroke-amber-500'
    case 'off': return 'stroke-muted-foreground'
  }
}

const SIZES = {
  sm: { svgSize: 64, radius: 26, strokeWidth: 4, fontSize: 'text-sm', labelSize: 'text-[9px]' },
  md: { svgSize: 120, radius: 50, strokeWidth: 6, fontSize: 'text-2xl', labelSize: 'text-xs' },
  lg: { svgSize: 160, radius: 68, strokeWidth: 8, fontSize: 'text-4xl', labelSize: 'text-sm' },
}

export function TrustScoreGauge({ score, tier, size = 'md' }: TrustScoreGaugeProps) {
  const { svgSize, radius, strokeWidth, fontSize, labelSize } = SIZES[size]
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const dashOffset = circumference - (clampedScore / 100) * circumference
  const center = svgSize / 2

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={cn('transition-all duration-700', strokeColor(tier))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold tabular-nums', fontSize, tierColor(tier))}>
          {Math.round(clampedScore)}
        </span>
        {size !== 'sm' && (
          <span className={cn('uppercase tracking-widest text-muted-foreground', labelSize)}>trust</span>
        )}
      </div>
    </div>
  )
}
