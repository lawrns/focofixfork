'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Activity, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react'

interface WorkflowRun {
  workflowId: string
  runId: string
  type: string
  status: string
  startTime: string | null
  closeTime: string | null
}

interface WorkflowListProps {
  workflows: WorkflowRun[]
  loading?: boolean
  error?: string | null
}

const STATUS_STYLES: Record<string, string> = {
  Running:        'bg-blue-500/10 text-blue-600 border-blue-400/40',
  Completed:      'bg-emerald-500/10 text-emerald-600 border-emerald-400/40',
  Failed:         'bg-rose-500/10 text-rose-600 border-rose-400/40',
  Canceled:       'bg-zinc-500/10 text-zinc-500 border-zinc-400/40',
  Terminated:     'bg-orange-500/10 text-orange-600 border-orange-400/40',
  ContinuedAsNew: 'bg-purple-500/10 text-purple-600 border-purple-400/40',
  TimedOut:       'bg-amber-500/10 text-amber-600 border-amber-400/40',
  Unknown:        'bg-zinc-500/10 text-zinc-500 border-zinc-400/40',
}

export function WorkflowList({ workflows, loading, error }: WorkflowListProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workflows…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 text-muted-foreground text-sm py-4">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
        {error}
      </div>
    )
  }

  if (workflows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        No recent workflows. Trigger one from the Actions menu.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {workflows.map(wf => (
        <WorkflowRow key={wf.runId} wf={wf} />
      ))}
    </div>
  )
}

function WorkflowRow({ wf }: { wf: WorkflowRun }) {
  const statusStyle = STATUS_STYLES[wf.status] ?? STATUS_STYLES.Unknown
  const started = wf.startTime ? new Date(wf.startTime).toLocaleString() : '—'

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{wf.type}</span>
          <Badge
            variant="outline"
            className={cn('text-[10px] font-mono-display border', statusStyle)}
          >
            {wf.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-muted-foreground font-mono-display truncate">
            {wf.workflowId}
          </span>
          <span className="text-[11px] text-muted-foreground">{started}</span>
        </div>
      </div>
    </div>
  )
}
