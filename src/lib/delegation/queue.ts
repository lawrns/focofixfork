import { supabaseAdmin } from '@/lib/supabase-server'
import { createTaskExecutionEvent } from '@/features/task-intake'

export type ProjectDelegationQueueItem = {
  id: string
  title: string
  status: string
  priority: string | null
  delegation_status: string | null
  assigned_agent: string | null
  run_id: string | null
  position: string | number | null
  created_at: string
  updated_at: string
  ready: boolean
  blocker_count: number
  blockers: Array<{
    id: string
    title: string
    status: string | null
  }>
}

type TaskRow = {
  id: string
  workspace_id: string
  project_id: string
  title: string
  status: string
  priority: string | null
  delegation_status: string | null
  assigned_agent: string | null
  run_id: string | null
  position: string | number | null
  created_at: string
  updated_at: string
}

const PRIORITY_SCORE: Record<string, number> = {
  urgent: 5,
  high: 4,
  medium: 3,
  low: 2,
  none: 1,
}

function compareNullableStrings(a: string | number | null, b: string | number | null) {
  const left = a == null ? '' : String(a)
  const right = b == null ? '' : String(b)
  return left.localeCompare(right)
}

function queueRank(item: ProjectDelegationQueueItem): number {
  if (item.delegation_status === 'running') return 0
  if (item.delegation_status === 'delegated') return 1
  if (item.delegation_status === 'pending' && item.ready) return 2
  if (item.delegation_status === 'pending' && !item.ready) return 3
  if (item.delegation_status === 'failed') return 4
  if (item.delegation_status === 'completed') return 5
  if (item.delegation_status === 'cancelled') return 6
  return 7
}

export function compareDelegationQueueItems(a: ProjectDelegationQueueItem, b: ProjectDelegationQueueItem): number {
  const rankDelta = queueRank(a) - queueRank(b)
  if (rankDelta !== 0) return rankDelta

  const priorityDelta = (PRIORITY_SCORE[b.priority ?? 'none'] ?? 0) - (PRIORITY_SCORE[a.priority ?? 'none'] ?? 0)
  if (priorityDelta !== 0) return priorityDelta

  const positionDelta = compareNullableStrings(a.position, b.position)
  if (positionDelta !== 0) return positionDelta

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

export async function listProjectDelegationQueue(projectId: string): Promise<ProjectDelegationQueueItem[]> {
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('work_items')
    .select('id, workspace_id, project_id, title, status, priority, delegation_status, assigned_agent, run_id, position, created_at, updated_at')
    .eq('project_id', projectId)
    .not('delegation_status', 'is', null)

  if (tasksError) {
    throw tasksError
  }

  const rows = (tasks ?? []).filter((task: TaskRow) => task.delegation_status && task.delegation_status !== 'none') as TaskRow[]
  if (rows.length === 0) return []

  const taskIds = rows.map((task) => task.id)
  const { data: dependencies, error: dependencyError } = await supabaseAdmin
    .from('work_item_dependencies')
    .select(`
      work_item_id,
      depends_on:work_items!work_item_dependencies_depends_on_id_fkey (
        id,
        title,
        status
      )
    `)
    .in('work_item_id', taskIds)

  if (dependencyError) {
    throw dependencyError
  }

  const blockersByTask = new Map<string, ProjectDelegationQueueItem['blockers']>()
  for (const dependency of dependencies ?? []) {
    const blocker = Array.isArray(dependency.depends_on) ? dependency.depends_on[0] : dependency.depends_on
    if (!blocker || blocker.status === 'done') continue
    const next = blockersByTask.get(dependency.work_item_id) ?? []
    next.push({
      id: blocker.id,
      title: blocker.title,
      status: blocker.status,
    })
    blockersByTask.set(dependency.work_item_id, next)
  }

  return rows
    .map((task) => {
      const blockers = blockersByTask.get(task.id) ?? []
      return {
        ...task,
        ready: blockers.length === 0 && task.status !== 'done',
        blocker_count: blockers.length,
        blockers,
      }
    })
    .sort(compareDelegationQueueItems)
}

export async function queueProjectTasksForDelegation(args: {
  projectId: string
  taskIds: string[]
  actorId: string
}): Promise<ProjectDelegationQueueItem[]> {
  const uniqueTaskIds = Array.from(new Set(args.taskIds.filter(Boolean)))
  if (uniqueTaskIds.length === 0) return []

  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('work_items')
    .select('id, workspace_id, project_id, title, status, delegation_status')
    .eq('project_id', args.projectId)
    .in('id', uniqueTaskIds)

  if (tasksError) {
    throw tasksError
  }

  const eligibleTasks = (tasks ?? []).filter((task: { status: string }) => task.status !== 'done')
  if (eligibleTasks.length === 0) {
    return listProjectDelegationQueue(args.projectId)
  }

  const now = new Date().toISOString()
  const eligibleIds = eligibleTasks.map((task: { id: string }) => task.id)
  const { error: updateError } = await supabaseAdmin
    .from('work_items')
    .update({
      delegation_status: 'pending',
      updated_at: now,
    })
    .in('id', eligibleIds)

  if (updateError) {
    throw updateError
  }

  await Promise.all(eligibleTasks.map((task: { id: string; workspace_id: string; project_id: string; title: string }) => (
    createTaskExecutionEvent({
      workItemId: task.id,
      workspaceId: task.workspace_id,
      projectId: task.project_id,
      actorType: 'user',
      actorId: args.actorId,
      eventType: 'queued_for_delegation',
      summary: 'Task queued for dependency-driven AI delegation.',
      details: {
        mode: 'dependency_auto',
      },
    })
  )))

  return listProjectDelegationQueue(args.projectId)
}
