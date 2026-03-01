import { supabaseAdmin } from '@/lib/supabase-server'
import { loadHandbook, formatHandbookForAgent, getHandbookSummary, AgentHandbook } from '@/lib/handbook/handbook-loader'

export type DelegationStatus = 'none' | 'pending' | 'delegated' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AgentType = 'clawdbot' | 'bosun' | 'codex' | 'claude-code' | 'pi'

export interface DelegationContext {
  workItemId: string
  projectId: string
  title: string
  description?: string
  assignedAgentPool: string[]
  handbook?: AgentHandbook | null
}

export interface DispatchPayload {
  workItemId: string
  projectId: string
  title: string
  description?: string
  agent: AgentType
  handbook: string
  instructions: string
  callbackUrl: string
  trace: Record<string, unknown>
}

export interface DelegationResult {
  success: boolean
  runId?: string
  agent?: AgentType
  error?: string
}

const AGENT_BACKENDS: Record<AgentType, { url: string; token?: string }> = {
  'clawdbot': {
    url: process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794',
    token: process.env.OPENCLAW_SERVICE_TOKEN
  },
  'bosun': {
    url: process.env.BOSUN_API_URL ?? 'http://127.0.0.1:3001',
    token: process.env.BOSUN_SERVICE_TOKEN
  },
  'codex': {
    url: process.env.CODEX_API_URL ?? 'http://127.0.0.1:3002',
    token: process.env.CODEX_SERVICE_TOKEN
  },
  'claude-code': {
    url: process.env.CLAUDE_CODE_API_URL ?? 'http://127.0.0.1:3003',
    token: process.env.CLAUDE_CODE_SERVICE_TOKEN
  },
  'pi': {
    url: process.env.PI_API_URL ?? 'http://127.0.0.1:3004',
    token: process.env.PI_SERVICE_TOKEN
  }
}

/**
 * Query pending work items with enabled project policies
 */
export async function getPendingWorkItems(): Promise<DelegationContext[]> {
  const { data: items, error } = await supabaseAdmin
    .from('work_items')
    .select(`
      id,
      title,
      description,
      project_id,
      projects:project_id (
        id,
        slug,
        delegation_settings,
        assigned_agent_pool
      )
    `)
    .eq('delegation_status', 'pending')
    .limit(50)

  if (error) {
    console.error('Failed to fetch pending work items:', error)
    return []
  }

  if (!items || items.length === 0) {
    return []
  }

  // Filter to only projects with auto-delegation enabled
  const contexts: DelegationContext[] = []
  
  for (const item of items) {
    const project = item.projects as any
    if (!project) continue

    const settings = project.delegation_settings || {}
    const agentPool = project.assigned_agent_pool || []

    // Skip if auto-delegation is not enabled
    if (!settings.enabled) continue

    // Skip if no agent pool configured
    if (!agentPool.length) continue

    contexts.push({
      workItemId: item.id,
      projectId: item.project_id,
      title: item.title,
      description: item.description || undefined,
      assignedAgentPool: agentPool,
      handbook: null // Will be loaded separately
    })
  }

  return contexts
}

/**
 * Match work item to available agent from pool
 */
export function matchAgent(pool: string[]): AgentType | null {
  // Filter to supported agents
  const supported: AgentType[] = ['clawdbot', 'bosun']
  const available = pool.filter(agent => supported.includes(agent as AgentType))

  if (available.length === 0) {
    return null
  }

  // Simple round-robin: pick first available
  // TODO: Add load balancing based on agent health/status
  return available[0] as AgentType
}

/**
 * Load handbook for project
 */
export async function loadProjectHandbook(projectSlug: string): Promise<AgentHandbook | null> {
  return loadHandbook(projectSlug)
}

/**
 * Dispatch task to agent backend
 */
export async function dispatchToAgent(
  payload: DispatchPayload
): Promise<{ runId: string } | { error: string }> {
  const backend = AGENT_BACKENDS[payload.agent]
  if (!backend) {
    return { error: `Unknown agent: ${payload.agent}` }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (backend.token) {
      headers['Authorization'] = `Bearer ${backend.token}`
    }

    const response = await fetch(`${backend.url}/api/dispatch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { error: `Backend returned ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    
    if (!result.runId) {
      return { error: 'Backend did not return runId' }
    }

    return { runId: result.runId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dispatch failed'
    return { error: message }
  }
}

/**
 * Update work_item status
 */
export async function updateWorkItemStatus(
  workItemId: string,
  status: DelegationStatus,
  updates?: {
    assignedAgent?: string
    runId?: string
    outputs?: unknown[]
    error?: string
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    delegation_status: status,
    updated_at: new Date().toISOString()
  }

  if (updates?.assignedAgent !== undefined) {
    updateData.assigned_agent = updates.assignedAgent
  }

  if (updates?.runId !== undefined) {
    updateData.run_id = updates.runId
  }

  if (updates?.outputs !== undefined) {
    updateData.outputs = updates.outputs
  }

  if (updates?.error !== undefined) {
    updateData.error_message = updates.error
  }

  const { error } = await supabaseAdmin
    .from('work_items')
    .update(updateData)
    .eq('id', workItemId)

  if (error) {
    console.error('Failed to update work item:', error)
    return false
  }

  return true
}

/**
 * Create run record
 */
export async function createRun(
  workItemId: string,
  projectId: string,
  agent: AgentType,
  instructions: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('runs')
    .insert({
      runner: agent,
      status: 'pending',
      task_id: workItemId,
      project_id: projectId,
      trace: {
        description: 'Auto-delegated task',
        instructions,
        auto_delegated: true,
        delegated_at: new Date().toISOString()
      }
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Failed to create run:', error)
    return null
  }

  return data.id
}

/**
 * Process a single pending work item through the delegation pipeline
 */
export async function processDelegation(context: DelegationContext): Promise<DelegationResult> {
  try {
    // 1. Match to agent
    const agent = matchAgent(context.assignedAgentPool)
    if (!agent) {
      return { success: false, error: 'No available agent in pool' }
    }

    // 2. Load handbook
    const projectSlug = (await getProjectSlug(context.projectId)) || 'default'
    const handbook = await loadProjectHandbook(projectSlug)
    const handbookSummary = getHandbookSummary(handbook)

    // 3. Create run record
    const instructions = buildInstructions(context, handbook)
    const runId = await createRun(context.workItemId, context.projectId, agent, instructions)
    if (!runId) {
      return { success: false, error: 'Failed to create run record' }
    }

    // 4. Update work_item to delegated
    const updated = await updateWorkItemStatus(context.workItemId, 'delegated', {
      assignedAgent: agent,
      runId
    })

    if (!updated) {
      // Clean up run if update failed
      await supabaseAdmin.from('runs').delete().eq('id', runId)
      return { success: false, error: 'Failed to update work item status' }
    }

    // 5. Build dispatch payload
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/delegation/callback`
    const payload: DispatchPayload = {
      workItemId: context.workItemId,
      projectId: context.projectId,
      title: context.title,
      description: context.description,
      agent,
      handbook: formatHandbookForAgent(handbook),
      instructions,
      callbackUrl,
      trace: {
        run_id: runId,
        handbook_summary: handbookSummary,
        dispatched_at: new Date().toISOString()
      }
    }

    // 6. Dispatch to agent backend
    const dispatchResult = await dispatchToAgent(payload)

    if ('error' in dispatchResult) {
      // Mark as failed
      await updateWorkItemStatus(context.workItemId, 'failed', { error: dispatchResult.error })
      await supabaseAdmin
        .from('runs')
        .update({ 
          status: 'failed',
          ended_at: new Date().toISOString(),
          error_message: dispatchResult.error
        })
        .eq('id', runId)
      
      return { success: false, error: dispatchResult.error }
    }

    // 7. Update run with backend runId and mark as running
    await supabaseAdmin
      .from('runs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', runId)

    await updateWorkItemStatus(context.workItemId, 'running')

    // 8. Emit ledger event
    await emitLedgerEvent({
      type: 'task_delegated',
      source: 'delegation_engine',
      context_id: context.workItemId,
      payload: {
        work_item_id: context.workItemId,
        project_id: context.projectId,
        agent,
        run_id: runId,
        handbook_summary: handbookSummary
      }
    })

    return { success: true, runId, agent }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delegation failed'
    console.error('Delegation error:', error)
    return { success: false, error: message }
  }
}

/**
 * Build instructions for agent
 */
function buildInstructions(context: DelegationContext, handbook: AgentHandbook | null): string {
  const parts: string[] = [
    `# Task: ${context.title}`,
    ''
  ]

  if (context.description) {
    parts.push('## Description')
    parts.push(context.description)
    parts.push('')
  }

  parts.push('## Guidelines')
  parts.push('- Research before implementation')
  parts.push('- Follow existing code patterns')
  parts.push('- Write tests for new features')
  parts.push('- Commit with descriptive messages')
  parts.push('')

  if (handbook) {
    parts.push(formatHandbookForAgent(handbook))
  }

  return parts.join('\n')
}

/**
 * Get project slug
 */
async function getProjectSlug(projectId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('foco_projects')
    .select('slug')
    .eq('id', projectId)
    .single()

  if (error || !data) {
    return null
  }

  return data.slug
}

/**
 * Emit ledger event
 */
async function emitLedgerEvent(event: {
  type: string
  source: string
  context_id: string
  payload: Record<string, unknown>
}): Promise<void> {
  try {
    await supabaseAdmin.from('ledger_events').insert({
      type: event.type,
      source: event.source,
      context_id: event.context_id,
      payload: event.payload,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    // Non-critical, just log
    console.error('Failed to emit ledger event:', error)
  }
}

/**
 * Handle callback from agent backend
 */
export async function handleDelegationCallback(
  workItemId: string,
  status: 'completed' | 'failed',
  payload: {
    runId: string
    outputs?: unknown[]
    error?: string
    summary?: string
  }
): Promise<boolean> {
  try {
    // Update work_item status
    const updateSuccess = await updateWorkItemStatus(workItemId, status, {
      outputs: payload.outputs,
      error: payload.error
    })

    if (!updateSuccess) {
      return false
    }

    // Update run record
    await supabaseAdmin
      .from('runs')
      .update({
        status,
        ended_at: new Date().toISOString(),
        summary: payload.summary,
        error_message: payload.error,
        outputs: payload.outputs
      })
      .eq('id', payload.runId)

    // Emit ledger event
    await emitLedgerEvent({
      type: status === 'completed' ? 'task_completed' : 'task_failed',
      source: 'delegation_callback',
      context_id: workItemId,
      payload: {
        work_item_id: workItemId,
        run_id: payload.runId,
        status,
        error: payload.error,
        summary: payload.summary
      }
    })

    return true
  } catch (error) {
    console.error('Callback handling error:', error)
    return false
  }
}
