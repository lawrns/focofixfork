'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RunCard, type TerminalLine } from './run-card'
import type { Run } from './use-dashboard-data'

type RunCardGridProps = {
  runs: Run[]
  totalRuns?: number
  terminalLinesMap: Record<string, TerminalLine[]>
  connectionStatesMap?: Record<string, 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'>
  onStop?: (id: string) => void
  onDispatchClick?: () => void
}

export function RunCardGrid({ runs, totalRuns, terminalLinesMap, connectionStatesMap, onStop, onDispatchClick }: RunCardGridProps) {
  const router = useRouter()
  const gridCols =
    runs.length === 0
      ? ''
      : runs.length === 1
        ? 'grid-cols-1'
        : runs.length === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Runs</h3>
          <p className="text-[11px] text-muted-foreground">{runs.length === 0 ? 'Fleet idle' : `${runs.length} visible${typeof totalRuns === 'number' ? ` of ${totalRuns}` : ''}`}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {typeof totalRuns === 'number' && totalRuns > runs.length ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push('/runs')}>
              More
            </Button>
          ) : null}
        </div>
      </div>
      <div className="p-3">
      <AnimatePresence mode="popLayout">
        {runs.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 h-9 px-3 rounded-lg border border-dashed bg-muted/20 text-muted-foreground"
          >
            <Activity className="h-3.5 w-3.5 opacity-40" />
            <span className="text-xs">No active runs — fleet is idle</span>
            {onDispatchClick && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-auto opacity-60 hover:opacity-100"
                onClick={onDispatchClick}
              >
                Dispatch
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            layout
            className={cn('grid gap-3', gridCols)}
          >
            <AnimatePresence mode="popLayout">
              {runs.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  terminalLines={terminalLinesMap[run.id] || []}
                  connectionState={connectionStatesMap?.[run.id]}
                  onStop={onStop}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
