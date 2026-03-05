'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { AgentExecutionEvent } from './types'

interface ExecutionLogPanelProps {
  events: AgentExecutionEvent[]
  running: boolean
}

const STATUS_BADGE: Record<'queued' | 'executing' | 'completed' | 'error', string> = {
  queued: 'bg-amber-500/15 text-amber-600 border-amber-400/40',
  executing: 'bg-blue-500/15 text-blue-600 border-blue-400/40',
  completed: 'bg-emerald-500/15 text-emerald-600 border-emerald-400/40',
  error: 'bg-rose-500/15 text-rose-600 border-rose-400/40',
}

function formatEventLabel(event: AgentExecutionEvent): string {
  if (event.type === 'status_update') return event.message ?? `Status: ${event.status}`
  if (event.type === 'output_chunk') return event.text
  if (event.type === 'reasoning') return event.text
  if (event.type === 'error') return event.message
  return event.summary ?? `Done (exit ${event.exitCode})`
}

export function ExecutionLogPanel({ events, running }: ExecutionLogPanelProps) {
  const timeline = useMemo(() => events.slice(-120), [events])

  if (timeline.length === 0 && !running) return null

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Execution Log</p>
        <Badge variant="outline" className={cn('text-[10px]', running ? STATUS_BADGE.executing : STATUS_BADGE.completed)}>
          {running ? 'LIVE' : 'COMPLETE'}
        </Badge>
      </div>

      <ScrollArea className="max-h-56 rounded-md border border-border/40 bg-background/50 p-2">
        <div className="space-y-1.5 pr-2">
          {timeline.map((event, index) => (
            <div key={`${event.timestamp}-${event.type}-${index}`} className="rounded-md border border-border/30 bg-background/80 px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                {event.type === 'status_update' && (
                  <Badge variant="outline" className={cn('h-4 text-[9px] border', STATUS_BADGE[event.status])}>
                    {event.status}
                  </Badge>
                )}
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                {('phase' in event) && event.phase && <span className="uppercase">{event.phase}</span>}
              </div>
              <p className={cn(
                'whitespace-pre-wrap break-words',
                event.type === 'error' && 'text-rose-500',
                event.type === 'reasoning' && 'text-muted-foreground',
              )}>
                {formatEventLabel(event)}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
