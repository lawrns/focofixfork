import type { PlanStep, StepResult } from './types'

export interface ExecutionOutcome {
  resourceType: string
  resourceId?: string
  label: string
  viewLabel: string
  viewRoute: string
}

const ROUTE_MAP: Record<string, { label: string; viewLabel: string; viewRoute: string | ((id: string) => string) }> = {
  create_project: { label: 'Project created', viewLabel: 'View project', viewRoute: '/empire/missions' },
  create_task: { label: 'Task created', viewLabel: 'View task', viewRoute: '/my-work' },
  create_cron: { label: 'Cron created', viewLabel: 'View cron', viewRoute: '/crons' },
  send_email: { label: 'Email sent', viewLabel: 'View emails', viewRoute: '/emails' },
  create_run: { label: 'Run started', viewLabel: 'View run', viewRoute: (id: string) => `/runs/${id}` },
}

function extractResourceId(_stepType: string, result: StepResult): string | undefined {
  if (!result || typeof result !== 'object') return undefined
  const r = result as Record<string, unknown>
  if ('projectId' in r && typeof r.projectId === 'string') return r.projectId
  if ('taskId' in r && typeof r.taskId === 'string') return r.taskId
  if ('cronId' in r && typeof r.cronId === 'string') return r.cronId
  if ('runId' in r && typeof r.runId === 'string') return r.runId
  if ('emailId' in r && typeof r.emailId === 'string') return r.emailId
  return undefined
}

/**
 * Walk completed execution steps and extract the first actionable resource outcome.
 */
export function extractOutcome(steps: PlanStep[]): ExecutionOutcome {
  for (const step of steps) {
    if (step.status !== 'completed' || !step.result) continue

    const mapping = ROUTE_MAP[step.type]
    if (!mapping) continue

    const resourceId = extractResourceId(step.type, step.result as StepResult)
    const viewRoute = typeof mapping.viewRoute === 'function'
      ? mapping.viewRoute(resourceId ?? '')
      : mapping.viewRoute

    return {
      resourceType: step.type,
      resourceId,
      label: mapping.label,
      viewLabel: mapping.viewLabel,
      viewRoute,
    }
  }

  return {
    resourceType: 'unknown',
    label: 'Command completed',
    viewLabel: 'Go to dashboard',
    viewRoute: '/dashboard',
  }
}
