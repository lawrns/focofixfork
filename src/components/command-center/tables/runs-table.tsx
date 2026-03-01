'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CritterLaunchPadButton } from '@/components/critter/critter-launch-pad-button'
import type { Run } from '@/lib/types/runs'
import { RUN_STATUS_COLORS } from '@/lib/types/runs'

export function RunsTable() {
  const [runs, setRuns] = useState<Run[]>([])
  const [fetching, setFetching] = useState(false)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/runs?limit=30')
      const json = await res.json()
      setRuns(json.data ?? [])
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={fetching} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', fetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-2 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No runs recorded</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {runs.map(run => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-colors"
            >
              <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium font-mono-display">{run.runner}</span>
                  <Badge className={cn('text-[10px] px-1.5 py-0 rounded-sm border-0',
                    RUN_STATUS_COLORS[run.status as keyof typeof RUN_STATUS_COLORS] ?? RUN_STATUS_COLORS.cancelled
                  )}>
                    {run.status}
                  </Badge>
                </div>
                {run.summary && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{run.summary}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-[11px] text-muted-foreground">
                {run.status === 'running' && (
                  <CritterLaunchPadButton
                    label={`Run ${run.id.slice(0, 6)}`}
                    runId={run.id}
                    runner={run.runner}
                    size="sm"
                    variant="ghost"
                    onClick={e => e.preventDefault()}
                    title="Dispatch critter swarm"
                  >
                    <Zap className="h-3 w-3" />
                  </CritterLaunchPadButton>
                )}
                {new Date(run.created_at).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
