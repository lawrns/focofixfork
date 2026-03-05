import { supabaseAdmin } from '@/lib/supabase-server'
import type { DraftPlanResult, DraftPlanTask, ExecutionMode } from '../types'

interface ProjectPolicy {
  auto_queue_agent_tasks?: boolean
  require_human_approval_for_delegation?: boolean
  verification_required_before_done?: boolean
}

interface ApproveDraftResult {
  createdTaskIds: string[]
  queuedTaskIds: string[]
}

function normalizeLine(line: string): string {
  return line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
}

function inferPriority(text: string): DraftPlanTask['priority'] {
  if (/(critical|urgent|asap|p0|p1)/i.test(text)) return 'urgent'
  if (/(important|high priority|soon)/i.test(text)) return 'high'
  if (/(nice to have|later|minor|low priority)/i.test(text)) return 'low'
  return 'medium'
}

function inferExecutionMode(text: string): ExecutionMode {
  if (/(code|implement|build|refactor|test|api|schema|migration|deploy|agent)/i.test(text)) {
    return 'agent'
  }
  if (/(review|approve|align|discuss|decide|stakeholder|copy|design)/i.test(text)) {
    return 'human'
  }
  return 'hybrid'
}

function inferStatus(text: string): DraftPlanTask['status'] {
  if (/(verify|validate|review|qa|test)/i.test(text)) return 'review'
  if (/(blocked|dependency|waiting)/i.test(text)) return 'blocked'
  return 'backlog'
}

function inferAgent(text: string): string | null {
  if (/(copy|content|research)/i.test(text)) return 'clawdbot'
  if (/(code|implement|api|schema|test|fix)/i.test(text)) return 'codex'
  return null
}

function buildAcceptanceCriteria(line: string): string[] {
  const criteria = [
    `Outcome for "${line}" is visible on the project board.`,
    'Completion notes summarize what changed.',
  ]

  if (/(test|verify|qa)/i.test(line)) {
    criteria.push('Verification evidence is attached to the task.')
  }

  return criteria
}

function buildVerificationSteps(line: string): string[] {
  const steps = ['Record a concise completion summary.']

  if (/(api|schema|migration|backend)/i.test(line)) {
    steps.push('Run the relevant backend or database verification command.')
  } else if (/(ui|frontend|page|board)/i.test(line)) {
    steps.push('Verify the UI behavior on the affected screen.')
  } else {
    steps.push('Confirm the intended outcome manually.')
  }

  return steps
}

export function decomposeProjectBrief(sourceText: string): DraftPlanResult {
  const lines = sourceText
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)

  const title = lines[0]?.slice(0, 120) || 'Project Brief'
  const explicitTasks = lines.filter((line) => /^([A-Z][^:]+:|[a-z])/i.test(line))
  const taskLines = explicitTasks.length > 0 ? explicitTasks : [title]

  const tasks: DraftPlanTask[] = taskLines.slice(0, 12).map((line, index) => ({
    id: `draft-task-${index + 1}`,
    title: line.length > 120 ? `${line.slice(0, 117)}...` : line,
    description: line,
    priority: inferPriority(line),
    status: inferStatus(line),
    recommended_execution: inferExecutionMode(line),
    recommended_agent: inferAgent(line),
    estimated_hours: /(large|complex|integration|migration)/i.test(line) ? 6 : 2,
    acceptance_criteria: buildAcceptanceCriteria(line),
    verification_steps: buildVerificationSteps(line),
    dependencies: index > 0 ? [`draft-task-${index}`] : [],
  }))

  const goals = lines.slice(0, 4)
  const constraints = lines.filter((line) => /(must|should|cannot|don't|without|need to)/i.test(line)).slice(0, 5)
  const milestones = tasks.slice(0, 3).map((task, index) => ({
    id: `milestone-${index + 1}`,
    title: task.title,
    goal: task.description || task.title,
  }))

  return {
    title,
    summary: goals.slice(0, 2).join(' '),
    goals,
    constraints,
    milestones,
    tasks,
    confidence_score: tasks.length > 1 ? 0.72 : 0.55,
  }
}

export async function createProjectBriefDraft(input: {
  userId: string
  workspaceId: string
  projectId: string
  sourceText: string
}): Promise<{ id: string; draftPlan: DraftPlanResult }> {
  if (!supabaseAdmin) throw new Error('Database not available')

  const draftPlan = decomposeProjectBrief(input.sourceText)

  const { data, error } = await supabaseAdmin
    .from('task_brief_drafts')
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      title: draftPlan.title,
      source_text: input.sourceText,
      summary: {
        summary: draftPlan.summary,
        goals: draftPlan.goals,
        constraints: draftPlan.constraints,
      },
      draft_plan: draftPlan,
      confidence_score: draftPlan.confidence_score,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create task brief draft')
  }

  return { id: data.id, draftPlan }
}

export async function approveProjectBriefDraft(input: {
  draftId: string
  userId: string
}): Promise<ApproveDraftResult> {
  if (!supabaseAdmin) throw new Error('Database not available')

  const { data: draft, error } = await supabaseAdmin
    .from('task_brief_drafts')
    .select('*')
    .eq('id', input.draftId)
    .maybeSingle()

  if (error || !draft) {
    throw new Error(error?.message || 'Draft not found')
  }

  if (draft.user_id !== input.userId) {
    throw new Error('Unauthorized')
  }

  if (draft.status === 'approved') {
    return { createdTaskIds: [], queuedTaskIds: [] }
  }

  const draftPlan = draft.draft_plan as DraftPlanResult
  const { data: project } = await supabaseAdmin
    .from('foco_projects')
    .select('delegation_settings')
    .eq('id', draft.project_id)
    .maybeSingle()

  const policy = (project?.delegation_settings ?? {}) as ProjectPolicy
  const autoQueue = policy.auto_queue_agent_tasks === true && policy.require_human_approval_for_delegation !== true

  const createdTaskIds: string[] = []
  const queuedTaskIds: string[] = []
  const materializedIdsByDraftId = new Map<string, string>()

  for (const task of draftPlan.tasks) {
    const parentId = task.dependencies.length > 0 ? materializedIdsByDraftId.get(task.dependencies[0]) ?? null : null
    const delegationStatus = autoQueue && task.recommended_execution !== 'human' ? 'pending' : null

    const metadata = {
      source: 'intake',
      brief_draft_id: draft.id,
      recommended_execution: task.recommended_execution,
      recommended_agent: task.recommended_agent ?? null,
      acceptance_criteria: task.acceptance_criteria,
      verification_steps: task.verification_steps,
      execution_state: {
        summary: null,
        latest_event: 'created_from_brief',
      },
      verification_summary: {
        required: Boolean(policy.verification_required_before_done),
        latest_status: null,
      },
    }

    const { data: createdTask, error: createError } = await supabaseAdmin
      .from('work_items')
      .insert({
        workspace_id: draft.workspace_id,
        project_id: draft.project_id,
        parent_id: parentId,
        type: 'task',
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        priority: task.priority,
        reporter_id: input.userId,
        metadata,
        delegation_status: delegationStatus,
        assigned_agent: task.recommended_agent ?? null,
      })
      .select('id')
      .single()

    if (createError || !createdTask) {
      throw new Error(createError?.message || `Failed to create task "${task.title}"`)
    }

    materializedIdsByDraftId.set(task.id, createdTask.id)
    createdTaskIds.push(createdTask.id)
    if (delegationStatus === 'pending') queuedTaskIds.push(createdTask.id)

    await createTaskExecutionEvent({
      workItemId: createdTask.id,
      workspaceId: draft.workspace_id,
      projectId: draft.project_id,
      actorType: 'system',
      eventType: 'created_from_brief',
      summary: 'Task created from approved project brief.',
      details: {
        draft_id: draft.id,
        recommended_execution: task.recommended_execution,
        recommended_agent: task.recommended_agent,
      },
    })
  }

  await supabaseAdmin
    .from('task_brief_drafts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', draft.id)

  return { createdTaskIds, queuedTaskIds }
}

export async function createTaskExecutionEvent(input: {
  workItemId: string
  workspaceId: string
  projectId: string
  actorType: 'user' | 'agent' | 'system'
  actorId?: string | null
  eventType: string
  summary: string
  details?: Record<string, unknown>
}): Promise<void> {
  if (!supabaseAdmin) return

  await supabaseAdmin
    .from('task_execution_events')
    .insert({
      work_item_id: input.workItemId,
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      event_type: input.eventType,
      summary: input.summary,
      details: input.details ?? {},
    })
}
