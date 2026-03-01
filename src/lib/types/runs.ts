export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Run {
  id: string
  runner: string
  status: RunStatus
  task_id: string | null
  started_at: string | null
  ended_at: string | null
  summary: string | null
  created_at: string
}

export const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  pending:   'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  running:   'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed:    'bg-red-500/15 text-red-600 dark:text-red-400',
  cancelled: 'bg-zinc-500/15 text-zinc-500',
}
