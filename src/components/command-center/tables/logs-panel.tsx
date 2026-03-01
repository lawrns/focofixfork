'use client'

import { useRef, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollText, Clock, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOpenClawLogs } from '@/lib/hooks/use-openclaw-logs'

const LEVEL_COLORS: Record<string, string> = {
  error: 'text-red-400',
  warn:  'text-amber-400',
  info:  'text-blue-400',
  debug: 'text-zinc-500',
}

export function LogsPanel() {
  const { logs, connected, clear } = useOpenClawLogs()
  const [filter, setFilter] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const filtered = filter
    ? logs.filter(l => JSON.stringify(l).toLowerCase().includes(filter.toLowerCase()))
    : logs

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

      <div className="h-[400px] overflow-auto rounded-md border bg-black/90 p-4 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            Waiting for logs…
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((log, i) => {
              const inferredLevel =
                log.level ??
                (log.type === 'error' || /\b(failed|error|denied|crash)\b/i.test(log.message ?? '') ? 'error' : undefined) ??
                (log.type === 'connected' ? 'info' : undefined) ??
                (/\bwarn/i.test(log.message ?? '') ? 'warn' : undefined)
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
                  {log.message || JSON.stringify(log)}
                </div>
              )
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
