export type LoopType = 'morning_briefing' | 'pr_babysitter' | 'health_patrol' | 'codebase_gardening' | 'custom'
export type ScheduleKind = 'preset' | 'cron'
export type LoopStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'expired'
export type ExecutionBackend = 'clawdbot' | 'openclaw'
export type ExecutionMode = 'report_only' | 'bounded_execution'

export interface CofounderLoop {
  id: string
  user_id: string
  workspace_id: string
  loop_type: LoopType
  schedule_kind: ScheduleKind
  schedule_value: string
  timezone: string
  requested_execution_mode: ExecutionMode
  effective_execution_mode: ExecutionMode
  execution_backend: ExecutionBackend
  execution_target: Record<string, unknown>
  planning_agent?: Record<string, unknown> | null
  selected_project_ids: string[]
  git_strategy: Record<string, unknown>
  config: Record<string, unknown>
  policy_snapshot: Record<string, unknown>
  status: LoopStatus
  expires_at?: string | null
  last_tick_at?: string | null
  next_tick_at?: string | null
  active_session_id?: string | null
  iteration_count: number
  summary: Record<string, unknown>
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateLoopInput {
  workspace_id: string
  loop_type: LoopType
  schedule_kind: ScheduleKind
  schedule_value: string
  timezone?: string
  requested_execution_mode?: ExecutionMode
  execution_backend?: ExecutionBackend
  execution_target?: Record<string, unknown>
  planning_agent?: Record<string, unknown> | null
  selected_project_ids?: string[]
  git_strategy?: Record<string, unknown>
  config?: Record<string, unknown>
  expires_at?: string | null
}

export interface LoopTickClaim {
  loop: CofounderLoop
  claimed: boolean
  skipped: boolean
  reason?: string
}

export const PRESET_SCHEDULES: Record<string, string> = {
  every_2h: '0 */2 * * *',
  every_6h: '0 */6 * * *',
  every_12h: '0 */12 * * *',
  every_morning: '0 7 * * *',
  continuous: '*/5 * * * *',
}

export const LOOP_TYPE_LABELS: Record<LoopType | string, string> = {
  morning_briefing: 'Morning Briefing',
  pr_babysitter: 'PR Monitor',
  health_patrol: 'Health Patrol',
  codebase_gardening: 'Codebase Gardening',
  custom: 'Custom',
}

export const LOOP_TYPE_DESCRIPTIONS: Record<LoopType | string, string> = {
  morning_briefing: 'Daily project health report delivered at a set time',
  pr_babysitter: 'Watches open PRs and alerts you to stale or risky ones',
  health_patrol: 'Periodic codebase health checks and risk alerts',
  codebase_gardening: 'Surfaces tech debt and maintainability issues',
  custom: 'Write your own objective and schedule',
}

export const SCHEDULE_LABELS: Record<string, string> = {
  every_2h: 'Every 2 hours',
  every_6h: 'Every 6 hours',
  every_12h: 'Every 12 hours',
  every_morning: 'Every morning at 7am',
  continuous: 'Every 5 minutes',
}

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  report_only: 'Report Only',
  bounded_execution: 'Auto-Fix (with limits)',
}

export const BACKEND_LABELS: Record<ExecutionBackend, string> = {
  clawdbot: 'Standard',
  openclaw: 'Advanced',
}

export const STATUS_LABELS: Record<LoopStatus | string, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export function describeCronSchedule(kind: ScheduleKind, value: string, tz?: string): string {
  let base: string
  if (kind === 'preset') {
    base = SCHEDULE_LABELS[value] ?? value.replace(/_/g, ' ')
  } else {
    const parts = value.trim().split(/\s+/)
    if (parts.length !== 5) return value
    const [min, hour, dom, mon, dow] = parts
    if (value === '* * * * *') {
      base = 'Every minute'
    } else if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
      base = `Every ${min.slice(2)} minutes`
    } else if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
      base = `Every ${hour.slice(2)} hours`
    } else if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
      base = `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
    } else {
      base = value
    }
  }
  if (tz && tz !== 'UTC') return `${base} (${tz})`
  return base
}
