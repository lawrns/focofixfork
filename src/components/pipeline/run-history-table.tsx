'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BookOpen, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import type { PipelineRun } from '@/lib/pipeline/types'
import { cn } from '@/lib/utils'

interface RunHistoryTableProps {
  runs: PipelineRun[]
  onSelect?: (run: PipelineRun) => void
}

function StatusBadge({ status }: { status: PipelineRun['status'] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    planning: {
      label: 'Planning',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/30',
    },
    executing: {
      label: 'Executing',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'text-indigo-500 border-indigo-500/30',
    },
    reviewing: {
      label: 'Reviewing',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: 'text-amber-500 border-amber-500/30',
    },
    complete: {
      label: 'Complete',
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: 'text-emerald-500 border-emerald-500/30',
    },
    failed: {
      label: 'Failed',
      icon: <XCircle className="h-3 w-3" />,
      className: 'text-destructive border-destructive/30',
    },
  }
  const cfg = map[status] ?? map.planning
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[11px] whitespace-nowrap', cfg.className)}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

function modelLabel(m: string) {
  const map: Record<string, string> = {
    'claude-opus-4-6':  'Opus 4.6',
    'kimi-k2-fast':     'Kimi Fast',
    'kimi-k2-standard': 'Kimi Std',
    'kimi-k2-max':      'Kimi Max',
    'codex-lite':       'Codex Lite',
    'codex-standard':   'Codex',
    'codex-pro':        'Codex Pro',
    'codex-max':        'Codex Max',
  }
  return map[m] ?? m
}

export function RunHistoryTable({ runs, onSelect }: RunHistoryTableProps) {
  if (!runs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Clock className="h-8 w-8 opacity-30" />
        <p className="text-sm">No pipeline runs yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Task</TableHead>
            <TableHead className="w-[96px]">Status</TableHead>
            <TableHead className="w-[160px]">Models</TableHead>
            <TableHead className="w-[56px] text-center">Files</TableHead>
            <TableHead className="w-[90px]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow
              key={run.id}
              className="cursor-pointer hover:bg-secondary/40"
              onClick={() => onSelect?.(run)}
            >
              <TableCell className="max-w-[240px]">
                <p
                  className="text-sm truncate"
                  title={run.task_description}
                >
                  {run.task_description}
                </p>
                {run.handbook_ref && (
                  <Badge variant="secondary" className="gap-1 text-[10px] mt-1">
                    <BookOpen className="h-2.5 w-2.5" />
                    {run.handbook_ref}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={run.status} />
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {modelLabel(run.planner_model)} →{' '}
                  {modelLabel(run.executor_model)}
                  {run.reviewer_model && ` → ${modelLabel(run.reviewer_model)}`}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs text-muted-foreground">
                  {run.files_changed?.length ?? 0}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(run.created_at).toLocaleDateString()}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
