'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CritterLaunchPadButton } from '@/components/critter/critter-launch-pad-button'
import { toast } from 'sonner'
import {
  Loader2,
  Clock,
  Trash2,
  Square,
  Activity,
  Play,
  ArrowRight,
  Eraser,
} from 'lucide-react'

type Run = {
  id: string
  runner: string
  status: string
  task_id: string | null
  started_at: string | null
  ended_at: string | null
  summary?: string | null
}

function elapsed(start: string | null): string {
  if (!start) return '—'
  const ms = Date.now() - new Date(start).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin shrink-0" />
    case 'pending':
      return <Play className="h-3.5 w-3.5 text-amber-500 shrink-0" />
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-teal-950/60 text-teal-400 border-teal-800'
    case 'pending':
      return 'bg-amber-950/60 text-amber-400 border-amber-800'
    default:
      return ''
  }
}

interface ActiveRunsProps {
  initialRuns?: Run[]
  onRunsChanged?: () => void
  className?: string
}

export function ActiveRuns({ initialRuns = [], onRunsChanged, className }: ActiveRunsProps) {
  const router = useRouter()
  const [runs, setRuns] = useState<Run[]>(initialRuns)
  const [busyRunId, setBusyRunId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/runs?status=running,pending&limit=10')
      const json = await res.json()
      const newRuns = json.data ?? []
      setRuns(newRuns)
    } catch {
      // silent fail - keep existing runs
    }
  }, [])

  const stopRun = useCallback(async (runId: string) => {
    setBusyRunId(runId)
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', summary: 'Stopped from dashboard' }),
      })
      if (!res.ok) throw new Error('Failed to stop run')
      toast.success('Run stopped')
      await poll()
      onRunsChanged?.()
    } catch {
      toast.error('Could not stop run')
    } finally {
      setBusyRunId(null)
    }
  }, [poll, onRunsChanged])

  const deleteRun = useCallback(async (runId: string) => {
    setBusyRunId(runId)
    try {
      const res = await fetch(`/api/runs/${runId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete run')
      toast.success('Run deleted')
      setRuns(prev => prev.filter(r => r.id !== runId))
      onRunsChanged?.()
    } catch {
      toast.error('Could not delete run')
    } finally {
      setBusyRunId(null)
    }
  }, [onRunsChanged])

  const clearAll = useCallback(async () => {
    if (runs.length === 0) return
    setClearingAll(true)
    try {
      await Promise.all(runs.map(r => fetch(`/api/runs/${r.id}`, { method: 'DELETE' })))
      setRuns([])
      onRunsChanged?.()
      toast.success(`Cleared ${runs.length} run${runs.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('Could not clear all runs')
    } finally {
      setClearingAll(false)
    }
  }, [runs, onRunsChanged])

  // Live polling every 10 seconds
  useEffect(() => {
    poll()
    const interval = setInterval(poll, 10_000)
    return () => clearInterval(interval)
  }, [poll])

  const runningCount = runs.filter(r => r.status === 'running').length
  const pendingCount = runs.filter(r => r.status === 'pending').length

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
          <h3 className="text-sm font-semibold">Active Runs</h3>
          {runs.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-teal-950/60 text-teal-400 border-teal-800"
            >
              {runs.length}
            </Badge>
          )}
          {runningCount > 0 && pendingCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ({runningCount} running, {pendingCount} pending)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {runs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-red-500"
              disabled={clearingAll || busyRunId !== null}
              onClick={clearAll}
              title="Delete all runs"
            >
              {clearingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Eraser className="h-3 w-3" />
              )}
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => router.push('/runs')}
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-border">
        {runs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="flex justify-center mb-3">
              <Activity className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">
              No active runs. Dispatch an agent to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push('/runs/new')}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start a run
            </Button>
          </div>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              {/* Status Icon */}
              {getStatusIcon(run.status)}

              {/* Run Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {run.summary || run.runner || run.id}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] shrink-0 ${getStatusBadgeClass(run.status)}`}
                  >
                    {run.status}
                  </Badge>
                </div>
                {(run.runner && run.summary) || run.task_id ? (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {run.runner && run.summary ? run.runner : run.task_id}
                  </p>
                ) : null}
              </div>

              {/* Elapsed Time */}
              <span className="text-[10px] text-muted-foreground font-mono shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {elapsed(run.started_at ?? null)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <CritterLaunchPadButton
                  runId={run.id}
                  runner={run.runner}
                  variant="ghost"
                  size="icon-sm"
                />
                {run.status === 'running' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={busyRunId === run.id}
                    onClick={() => stopRun(run.id)}
                    title="Stop run"
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-600 hover:text-red-700"
                  disabled={busyRunId === run.id}
                  onClick={() => deleteRun(run.id)}
                  title="Delete run"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
