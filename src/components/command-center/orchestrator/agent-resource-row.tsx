'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Power, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { UnifiedAgent } from '@/lib/command-center/types'
import { AGENT_STATUS_COLORS } from '@/lib/command-center/types'
import { cn } from '@/lib/utils'

const STATUS_TIPS: Record<string, string> = {
  working: 'Executing task',
  blocked: 'Waiting for input',
  idle: 'Standing by',
  error: 'Failed',
}

// Seeded pseudo-random for deterministic but varying CPU/memory per agent
function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash % 100) / 100
}

function minutesSince(iso?: string): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

interface AgentResourceRowProps {
  agent: UnifiedAgent
  onKill: (backend: string, nativeId: string) => Promise<void>
}

export function AgentResourceRow({ agent, onKill }: AgentResourceRowProps) {
  const metricsRef = useRef<{ cpu: number; mem: number }>({
    cpu: 30 + seededRandom(agent.id) * 40,
    mem: 25 + seededRandom(agent.id + '_mem') * 50,
  })

  const [metrics, setMetrics] = useState(metricsRef.current)

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 8)),
        mem: Math.max(15, Math.min(85, prev.mem + (Math.random() - 0.5) * 6)),
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const statusColor = AGENT_STATUS_COLORS[agent.status]
  const isError = agent.status === 'error'

  // Stagnancy: only flag agents that are supposed to be working
  const minsIdle = agent.status === 'working' ? minutesSince(agent.lastActiveAt) : 0
  const isAmberStale = minsIdle >= 30 && minsIdle < 60
  const isRoseStale  = minsIdle >= 60

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-md border bg-card p-3 text-[11px] sm:text-sm',
      isRoseStale  && 'border-rose-500/40',
      isAmberStale && !isRoseStale && 'border-amber-500/40',
    )}>
      {/* Status dot + Name */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Badge variant="outline" className={cn('text-xs font-mono', statusColor)}>
                  {agent.status}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{STATUS_TIPS[agent.status] ?? agent.status}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-semibold text-foreground truncate">{agent.name}</span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{agent.name}</TooltipContent>
          </Tooltip>

          {/* Stagnancy chip */}
          {(isAmberStale || isRoseStale) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                  isRoseStale
                    ? 'bg-rose-500/15 text-rose-500'
                    : 'bg-amber-500/15 text-amber-500',
                )}>
                  {/* Pulse dot */}
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full animate-pulse',
                    isRoseStale ? 'bg-rose-500' : 'bg-amber-500',
                  )} />
                  Stale {minsIdle}m
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {isRoseStale
                  ? `Working but no progress reported for ${minsIdle} minutes — may be stuck`
                  : `No activity update for ${minsIdle} minutes — monitoring`}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{agent.role}</span>
          {agent.model && (
            <>
              <span>•</span>
              <span className="font-mono">{agent.model}</span>
            </>
          )}
        </div>
      </div>

      {/* Resource bars */}
      <div className="flex items-center gap-3 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-0.5 items-center">
              <div className="w-16 h-2 rounded-sm bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full bg-[color:var(--foco-teal)] transition-all duration-300"
                  style={{ width: `${metrics.cpu}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground w-16 text-center">~{Math.round(metrics.cpu)}% CPU</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Estimated CPU usage (simulated)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-0.5 items-center">
              <div className="w-16 h-2 rounded-sm bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full bg-[color:var(--foco-teal)] transition-all duration-300"
                  style={{ width: `${metrics.mem}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground w-16 text-center">~{Math.round(metrics.mem)}% RAM</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Estimated memory usage (simulated)</TooltipContent>
        </Tooltip>
      </div>

      {/* Error indicator or kill button */}
      {isError ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Agent is in error state</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="xs"
              variant="ghost"
              className="h-7 w-7 p-0 hover:text-rose-600"
              onClick={() => onKill(agent.backend, agent.nativeId)}
            >
              <Power className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Stop this agent immediately</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
