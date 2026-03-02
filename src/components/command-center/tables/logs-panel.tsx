'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollText, Clock, Search, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOpenClawLogs } from '@/lib/hooks/use-openclaw-logs'

const LEVEL_COLORS: Record<string, string> = {
  error: 'text-red-400',
  warn:  'text-amber-400',
  info:  'text-blue-400',
  debug: 'text-zinc-500',
}

type LogSource = 'all' | 'agents' | 'crons' | 'system'

function inferSource(log: ReturnType<typeof useOpenClawLogs>['logs'][number]): Exclude<LogSource, 'all'> {
  const msg = (log.message ?? '').toLowerCase()
  const type = (log.type ?? '').toLowerCase()
  if (type === 'cron' || msg.includes('[cron]') || msg.includes('cron ') || msg.includes('heartbeat')) return 'crons'
  if (
    type === 'connected' || type === 'system' ||
    msg.includes('[system]') || msg.includes('gateway') || msg.includes('connected')
  ) return 'system'
  return 'agents'
}

const SOURCE_LABELS: Record<LogSource, string> = {
  all: 'All',
  agents: 'Agents',
  crons: 'Crons',
  system: 'System',
}

export function LogsPanel() {
  const { logs, connected, clear } = useOpenClawLogs()
  const [filter, setFilter] = useState('')
  const [source, setSource] = useState<LogSource>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }, [])

  const filtered = logs.filter(l => {
    if (source !== 'all' && inferSource(l) !== source) return false
    if (filter && !JSON.stringify(l).toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Gateway Log Stream</span>
          <Badge variant={connected ? 'default' : 'destructive'} className="text-[10px]">
            {connected ? 'LIVE' : 'OFF'}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter logs…"
            className="pl-8 h-8 w-48 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={clear} className="text-[11px]">Clear</Button>
      </div>

      {/* Source filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(Object.keys(SOURCE_LABELS) as LogSource[]).map(s => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors',
              source === s
                ? 'bg-[color:var(--foco-teal)] border-[color:var(--foco-teal)] text-white'
                : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {SOURCE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-[400px] overflow-auto rounded-md border bg-black/90 p-4 font-mono text-xs"
        >
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              {source === 'all' ? 'Waiting for logs…' : `No ${SOURCE_LABELS[source].toLowerCase()} logs yet`}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((log, i) => {
                const inferredLevel =
                  log.level ??
                  (log.type === 'error' || /\b(failed|error|denied|crash)\b/i.test(log.message ?? '') ? 'error' : undefined) ??
                  (log.type === 'connected' ? 'info' : undefined) ??
                  (/\bwarn/i.test(log.message ?? '') ? 'warn' : undefined)
                const logSource = inferSource(log)
                return (
                  <div
                    key={i}
                    className={cn(
                      'break-all',
                      inferredLevel ? LEVEL_COLORS[inferredLevel] : undefined,
                      log.type === 'connected' && 'text-green-400',
                      !inferredLevel && !log.type && 'text-gray-300',
                    )}
                  >
                    {log.time && (
                      <span className="text-gray-600 mr-2">
                        {new Date(log.time).toLocaleTimeString()}
                      </span>
                    )}
                    {/* Source tag for mixed view */}
                    {source === 'all' && logSource !== 'agents' && (
                      <span className={cn(
                        'mr-2 text-[9px] uppercase font-bold',
                        logSource === 'crons'  && 'text-violet-400',
                        logSource === 'system' && 'text-zinc-500',
                      )}>
                        [{logSource}]
                      </span>
                    )}
                    {log.message || JSON.stringify(log)}
                  </div>
                )
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
        {!autoScroll && filtered.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 right-3 h-7 gap-1 text-[10px] shadow-md opacity-90 hover:opacity-100"
            onClick={() => {
              setAutoScroll(true)
              logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <ArrowDown className="h-3 w-3" />
            Latest
          </Button>
        )}
      </div>
    </div>
  )
}
