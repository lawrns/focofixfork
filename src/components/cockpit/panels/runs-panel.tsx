'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRunStream } from '@/hooks/use-run-stream'
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  FileText,
  Pause,
  RefreshCw,
  Square,
  Terminal,
  XCircle,
} from 'lucide-react'
import type { Run } from '@/components/dashboard/use-dashboard-data'

/* ─── Time helpers ───────────────────────────────────────────────── */

function elapsed(startedAt: string | null, createdAt: string): string {
  const from = startedAt ?? createdAt
  const ms = Date.now() - new Date(from).getTime()
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3600_000)}h ago`
}

/* ─── Status badge ───────────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  running: {
    label: 'running',
    dot: 'bg-emerald-400 animate-pulse',
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40',
  },
  pending: {
    label: 'pending',
    dot: 'bg-amber-400',
    badge: 'bg-amber-950/60 text-amber-400 border-amber-900/40',
  },
  completed: {
    label: 'done',
    dot: 'bg-zinc-600',
    badge: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40',
  },
  failed: {
    label: 'failed',
    dot: 'bg-rose-500',
    badge: 'bg-rose-950/60 text-rose-400 border-rose-900/40',
  },
  cancelled: {
    label: 'cancelled',
    dot: 'bg-zinc-700',
    badge: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40',
  },
}

/* ─── Live log line ──────────────────────────────────────────────── */

const TOKEN_COLORS: Record<string, string> = {
  ACTION: 'text-teal-400',
  OBSERVE: 'text-sky-400',
  PLAN: 'text-violet-400',
  RESULT: 'text-emerald-400',
  ERROR: 'text-rose-400',
  INIT: 'text-zinc-500',
  output: 'text-zinc-300',
}

/* ─── Individual run card ────────────────────────────────────────── */

const RunCard = React.forwardRef<HTMLDivElement, {
  run: Run
  onStop: (id: string) => void
  onRetry: (id: string) => void
}>(function RunCard({ run, onStop, onRetry }, ref) {
  const [expanded, setExpanded] = useState(run.status === 'running')
  const [stopping, setStopping] = useState(false)

  const jobId = typeof run.trace?.job_id === 'string' ? run.trace.job_id : null
  const { lines, connectionState } = useRunStream(
    expanded && (run.status === 'running' || run.status === 'pending') ? run.id : null,
    expanded && (run.status === 'running' || run.status === 'pending') ? jobId : null,
  )

  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending
  const title = run.summary || run.task_id || `Run ${run.id.slice(0, 8)}`
  const runner = run.runner || 'unknown'

  const phase = typeof run.trace?.phase === 'string' ? run.trace.phase : null
  const step = typeof run.trace?.current_step === 'string' ? run.trace.current_step : null
  const progress = typeof run.trace?.progress === 'number' ? run.trace.progress : null
  const artifactCount = typeof run.trace?.artifact_count === 'number' ? run.trace.artifact_count : 0

  async function handleStop() {
    setStopping(true)
    try {
      await fetch(`/api/runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      onStop(run.id)
    } finally {
      setStopping(false)
    }
  }

  async function handleRetry() {
    try {
      await fetch(`/api/runs/${run.id}/retry`, { method: 'POST' })
      onRetry(run.id)
    } catch {}
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-xl border bg-[#0e0e10] overflow-hidden',
        run.status === 'running' && 'border-emerald-900/40',
        run.status === 'pending' && 'border-amber-900/30',
        run.status === 'failed' && 'border-rose-900/50',
        run.status === 'completed' && 'border-zinc-800/50',
        run.status === 'cancelled' && 'border-zinc-800/30 opacity-60',
      )}
    >
      {/* Header */}
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status dot */}
        <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-100 truncate">{title}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0', cfg.badge)}>
              {cfg.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 font-mono">
            <span className="text-zinc-400">{runner}</span>
            {phase && <span className="text-zinc-600">→ {phase}</span>}
            {step && !phase && <span className="text-zinc-600 truncate max-w-[200px]">{step}</span>}
          </div>

          {/* Progress bar */}
          {progress !== null && run.status === 'running' && (
            <div className="mt-2 h-0.5 bg-zinc-800 rounded-full overflow-hidden w-full">
              <motion.div
                className="h-full bg-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>

        {/* Right meta */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 text-[10px] text-zinc-600 font-mono">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{elapsed(run.started_at, run.created_at)}</span>
          </div>
          {artifactCount > 0 && (
            <div className="flex items-center gap-1 text-zinc-500">
              <FileText className="w-3 h-3" />
              <span>{artifactCount}</span>
            </div>
          )}
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      {/* Expanded: logs + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Stream state */}
            {(run.status === 'running' || run.status === 'pending') && (
              <div className="px-4 pb-1 flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono border-t border-zinc-800/40">
                <CircleDot className={cn('w-2.5 h-2.5', connectionState === 'live' ? 'text-emerald-500' : 'text-zinc-600')} />
                <span>{connectionState}</span>
              </div>
            )}

            {/* Log lines */}
            {lines.length > 0 && (
              <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                <div className="font-mono text-[10px] space-y-0.5">
                  {lines.slice(-20).map((line) => (
                    <div key={line.id} className={cn('leading-relaxed', TOKEN_COLORS[line.token] ?? 'text-zinc-400')}>
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-2.5 border-t border-zinc-800/40 flex items-center gap-2">
              {run.status === 'running' && (
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border border-rose-900/50 text-rose-400 hover:bg-rose-950/20 transition-colors disabled:opacity-50 font-mono"
                >
                  <Square className="w-2.5 h-2.5" />
                  stop
                </button>
              )}
              {run.status === 'failed' && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border border-amber-900/50 text-amber-400 hover:bg-amber-950/20 transition-colors font-mono"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  retry
                </button>
              )}
              <a
                href={`/runs/${run.id}`}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors font-mono ml-auto"
              >
                <Terminal className="w-2.5 h-2.5" />
                inspect
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
RunCard.displayName = 'RunCard'

/* ─── Panel ──────────────────────────────────────────────────────── */

interface RunsPanelProps {
  runs: Run[]
  onRefresh: () => void
  refreshing?: boolean
}

export function RunsPanel({ runs, onRefresh, refreshing }: RunsPanelProps) {
  const [stoppedIds, setStoppedIds] = useState<Set<string>>(new Set())

  const handleStop = useCallback((id: string) => {
    setStoppedIds(prev => new Set([...prev, id]))
    window.dispatchEvent(new Event('runs:mutated'))
  }, [])

  const handleRetry = useCallback(() => {
    window.dispatchEvent(new Event('runs:mutated'))
    onRefresh()
  }, [onRefresh])

  const visibleRuns = runs.filter(r => !stoppedIds.has(r.id))
  const running = visibleRuns.filter(r => r.status === 'running')
  const pending = visibleRuns.filter(r => r.status === 'pending')
  const failed = visibleRuns.filter(r => r.status === 'failed')
  const recent = visibleRuns.filter(r => r.status === 'completed' || r.status === 'cancelled')

  const grouped = [
    ...running,
    ...pending,
    ...failed,
    ...recent.slice(0, 5),
  ]

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Runs</h2>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {running.length > 0 && <span className="text-emerald-400">{running.length} running</span>}
            {pending.length > 0 && <span className="text-amber-400">{pending.length} pending</span>}
            {failed.length > 0 && <span className="text-rose-400">{failed.length} failed</span>}
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-mono flex items-center gap-1"
        >
          <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-700 gap-2">
            <XCircle className="w-6 h-6" />
            <span className="text-xs font-mono">no active runs</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {grouped.map(run => (
              <RunCard
                key={run.id}
                run={run}
                onStop={handleStop}
                onRetry={handleRetry}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
