'use client'

import { cn } from '@/lib/utils'
import { AnimatedCounter } from '@/components/ui/animated-counter'

interface TelemetryBarProps {
  tokens: number
  runtimeMs: number
  complexity: string
  confidence: number
  costUsd?: number
  isLive?: boolean // true = real API data, false = estimated
}

const COMPLEXITY_COLOR: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  high: 'bg-red-500/15 text-red-400 border-red-500/20',
  unknown: 'bg-muted text-muted-foreground border-border',
}

const CONFIDENCE_BAR: (n: number) => string = (n) =>
  n >= 80 ? 'bg-emerald-500' : n >= 60 ? 'bg-amber-500' : 'bg-red-500'

export function TelemetryBar({ tokens, runtimeMs, complexity, confidence, costUsd, isLive }: TelemetryBarProps) {
  const runtimeSec = runtimeMs / 1000
  const complexityKey = ['low', 'medium', 'high'].includes(complexity) ? complexity : 'unknown'

  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
      {/* Tokens */}
      <div className="flex flex-col gap-0.5 min-w-[80px]">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Tokens {isLive ? '' : '(est)'}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {isLive ? '' : '~'}<AnimatedCounter value={tokens} duration={600} />
        </span>
      </div>

      <div className="h-8 w-px bg-border hidden sm:block" />

      {/* Runtime */}
      <div className="flex flex-col gap-0.5 min-w-[80px]">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Runtime
        </span>
        <span className="text-sm font-semibold tabular-nums">
          <AnimatedCounter value={runtimeSec} duration={250} decimals={1} suffix="s" />
        </span>
      </div>

      <div className="h-8 w-px bg-border hidden sm:block" />

      {/* Cost */}
      {costUsd != null && costUsd > 0 && (
        <>
          <div className="flex flex-col gap-0.5 min-w-[60px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Cost
            </span>
            <span className="text-sm font-semibold tabular-nums">
              ${costUsd.toFixed(4)}
            </span>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block" />
        </>
      )}

      {/* Complexity */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Complexity
        </span>
        <span
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded border capitalize',
            COMPLEXITY_COLOR[complexityKey]
          )}
        >
          {complexity}
        </span>
      </div>

      <div className="h-8 w-px bg-border hidden sm:block" />

      {/* Confidence */}
      <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Confidence
          </span>
          <span className="text-[11px] font-semibold tabular-nums">
            {confidence > 0 ? `${confidence}%` : '—'}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', CONFIDENCE_BAR(confidence))}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  )
}
