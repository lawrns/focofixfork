'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Settings, Terminal, Circle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AutonomyMode = 'off' | 'advisor' | 'bounded' | 'near_full'

const MODE_LADDER: { id: AutonomyMode; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'advisor', label: 'Advisor' },
  { id: 'bounded', label: 'Bounded' },
  { id: 'near_full', label: 'Near Full' },
]

type SystemState = 'Guarded' | 'Active' | 'Paused' | 'Off'

interface BarState {
  mode: AutonomyMode
  activeLoops: number
  pendingDecisions: number
  spendLimit: string | null
  deploysAllowed: boolean
  systemState: SystemState
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modeToSystemState(mode: AutonomyMode, paused: boolean): SystemState {
  if (paused) return 'Paused'
  switch (mode) {
    case 'off': return 'Off'
    case 'advisor': return 'Guarded'
    case 'bounded': return 'Active'
    case 'near_full': return 'Active'
    default: return 'Off'
  }
}


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutonomySummaryBar() {
  const [state, setState] = useState<BarState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [decisionsRes, loopsRes] = await Promise.allSettled([
          fetch('/api/command-center/decisions'),
          fetch('/api/autonomy/loops?status=active&limit=100'),
        ])

        if (cancelled) return

        // --- decisions ---
        let pendingDecisions = 0
        if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) {
          const body = await decisionsRes.value.json() as { decisions?: unknown[] }
          pendingDecisions = body?.decisions?.length ?? 0
        }

        // --- loops ---
        let activeLoops = 0
        if (loopsRes.status === 'fulfilled' && loopsRes.value.ok) {
          const body = await loopsRes.value.json() as { data?: { data?: unknown[]; count?: number } | unknown[]; count?: number }
          const inner = body?.data
          activeLoops = (inner && !Array.isArray(inner) ? (inner as { count?: number }).count : null)
            ?? (Array.isArray(inner) ? inner.length : null)
            ?? (body as { count?: number })?.count
            ?? 0
        }

        // Mode not fetched from settings (that endpoint is unreliable server-side).
        // Show neutral state — user configures mode in Settings.
        const mode: AutonomyMode = 'bounded'
        const systemState = modeToSystemState(mode, false)

        setState({ mode, activeLoops, pendingDecisions, spendLimit: null, deploysAllowed: false, systemState })
      } catch {
        // Silently fail — bar is non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-3 rounded-lg border bg-muted/30 px-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
    )
  }

  if (!state) return null

  const { mode, activeLoops, pendingDecisions, spendLimit, deploysAllowed, systemState } = state

  const systemStateBadgeClass =
    systemState === 'Active'
      ? 'text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/40'
      : systemState === 'Paused'
      ? 'text-amber-500 border-amber-500/40'
      : systemState === 'Guarded'
      ? 'text-amber-500 border-amber-500/40'
      : 'text-rose-500 border-rose-500/40'

  const hardLimitText = [
    spendLimit ?? null,
    !deploysAllowed ? 'deploys off' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-10 w-full items-center gap-0 overflow-x-auto rounded-lg border bg-muted/30 px-2 text-xs">

        {/* Mode ladder */}
        <div className="flex shrink-0 items-center gap-0.5 pr-2">
          {MODE_LADDER.map((step, i) => {
            const isActive = step.id === mode
            const isPast = MODE_LADDER.findIndex((s) => s.id === mode) > i
            return (
              <span key={step.id} className="flex items-center gap-0.5">
                {i > 0 && (
                  <span className={cn('text-muted-foreground/50 select-none', isPast && 'text-[color:var(--foco-teal)]/50')}>
                    →
                  </span>
                )}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded font-medium transition-colors',
                    isActive
                      ? 'bg-[color:var(--foco-teal)]/15 text-[color:var(--foco-teal)] ring-1 ring-[color:var(--foco-teal)]/40'
                      : isPast
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground/40'
                  )}
                >
                  {step.label}
                </span>
              </span>
            )
          })}
        </div>

        <Divider />

        {/* System state */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 items-center gap-1 px-2">
              <Circle
                className={cn(
                  'h-2 w-2 fill-current',
                  systemState === 'Active'
                    ? 'text-[color:var(--foco-teal)]'
                    : systemState === 'Paused' || systemState === 'Guarded'
                    ? 'text-amber-500'
                    : 'text-rose-500'
                )}
              />
              <span className={cn('font-medium', systemStateBadgeClass)}>
                {systemState}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Current system autonomy state</TooltipContent>
        </Tooltip>

        <Divider />

        {/* Active loops */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 items-center gap-1 px-2 text-muted-foreground">
              <span className={cn('tabular-nums', activeLoops > 0 && 'text-[color:var(--foco-teal)]')}>
                {activeLoops}
              </span>
              <span>loop{activeLoops === 1 ? '' : 's'} active</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Recurring autonomy loops currently running</TooltipContent>
        </Tooltip>

        <Divider />

        {/* Pending decisions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 items-center gap-1 px-2 text-muted-foreground">
              {pendingDecisions > 0 && (
                <Circle className="h-1.5 w-1.5 fill-amber-500 text-amber-500" />
              )}
              <span className={cn('tabular-nums', pendingDecisions > 0 && 'text-amber-500 font-medium')}>
                {pendingDecisions}
              </span>
              <span className={pendingDecisions > 0 ? 'text-amber-500' : undefined}>
                pending decision{pendingDecisions === 1 ? '' : 's'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Agent actions awaiting your approval</TooltipContent>
        </Tooltip>

        {/* Hard limits */}
        {hardLimitText && (
          <>
            <Divider />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 items-center px-2 text-muted-foreground">
                  {hardLimitText}
                </div>
              </TooltipTrigger>
              <TooltipContent>Active hard limits from AI policy</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Spacer pushes buttons to right */}
        <div className="flex-1" />

        {/* Navigation links */}
        <div className="flex shrink-0 items-center gap-1 pl-2">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" asChild>
            <Link href="/settings#ai-policy">
              <Settings className="h-3 w-3" />
              Settings
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" asChild>
            <Link href="/empire/command">
              <Terminal className="h-3 w-3" />
              Command
            </Link>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}

// Small vertical divider helper
function Divider() {
  return <span className="h-4 w-px shrink-0 bg-border/60" aria-hidden />
}
