import type { SupabaseClient } from '@supabase/supabase-js'

type DataClient = Pick<SupabaseClient, 'from'>

export type WorkspaceThreadEntityType = 'workspace' | 'page' | 'database'
export type WorkspaceThreadStatus = 'open' | 'paused' | 'closed'
export type WorkspaceConnectorProvider = 'slack' | 'mail' | 'gmail'
export type WorkspaceConnectorStatus = 'connected' | 'paused' | 'error' | 'disconnected'

export interface WorkspaceAgentThreadRecord {
  id: string
  workspace_id: string
  entity_type: WorkspaceThreadEntityType
  entity_id: string | null
  title: string
  status: WorkspaceThreadStatus
  agent_id: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  last_message_at: string
  created_at: string
  updated_at: string
}

export interface WorkspaceAgentThreadMessageRecord {
  id: string
  thread_id: string
  workspace_id: string
  role: 'user' | 'assistant' | 'system' | 'event'
  content: string
  status: 'posted' | 'pending' | 'running' | 'completed' | 'failed'
  run_id: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceAgentConnectorRecord {
  id: string
  workspace_id: string
  provider: WorkspaceConnectorProvider
  label: string
  status: WorkspaceConnectorStatus
  capabilities: string[]
  config: Record<string, unknown>
  last_sync_at: string | null
  last_error: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceAutomationRunRecord {
  id: string
  job_id: string
  external_run_id: string | null
  status: string
  trigger_type: string
  started_at: string | null
  ended_at: string | null
  duration_ms: number | null
  logs: unknown[]
  output: Record<string, unknown>
  error: string | null
  trace: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkspaceAutomationRecord {
  id: string
  workspace_id: string
  name: string
  description: string | null
  enabled: boolean
  trigger_type: 'manual' | 'schedule' | 'page_updated' | 'database_row_updated' | 'workspace_event'
  event_name: string | null
  schedule: string | null
  entity_type: WorkspaceThreadEntityType
  entity_id: string | null
  prompt: string
  agent_id: string | null
  writeback_mode: string | null
  job_type: string
  last_status: string | null
  last_run_at: string | null
  metadata: Record<string, unknown>
  latest_run: WorkspaceAutomationRunRecord | null
  created_at: string
  updated_at: string
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function toStringArray(value: unknown): string[] {
  return toArray<unknown>(value).filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeThread(row: Record<string, unknown>): WorkspaceAgentThreadRecord {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    entity_type: String(row.entity_type) as WorkspaceThreadEntityType,
    entity_id: safeString(row.entity_id),
    title: String(row.title ?? 'Untitled thread'),
    status: (safeString(row.status) ?? 'open') as WorkspaceThreadStatus,
    agent_id: safeString(row.agent_id),
    metadata: toRecord(row.metadata),
    created_by: safeString(row.created_by),
    last_message_at: safeString(row.last_message_at) ?? new Date(0).toISOString(),
    created_at: safeString(row.created_at) ?? new Date(0).toISOString(),
    updated_at: safeString(row.updated_at) ?? new Date(0).toISOString(),
  }
}

function normalizeThreadMessage(row: Record<string, unknown>): WorkspaceAgentThreadMessageRecord {
  return {
    id: String(row.id),
    thread_id: String(row.thread_id),
    workspace_id: String(row.workspace_id),
    role: String(row.role) as WorkspaceAgentThreadMessageRecord['role'],
    content: String(row.content ?? ''),
    status: String(row.status ?? 'posted') as WorkspaceAgentThreadMessageRecord['status'],
    run_id: safeString(row.run_id),
    metadata: toRecord(row.metadata),
    created_by: safeString(row.created_by),
    created_at: safeString(row.created_at) ?? new Date(0).toISOString(),
    updated_at: safeString(row.updated_at) ?? new Date(0).toISOString(),
  }
}

function sanitizeConnectorConfig(provider: WorkspaceConnectorProvider, config: Record<string, unknown>) {
  if (provider === 'slack') {
    return {
      default_channel: safeString(config.default_channel),
      workspace_name: safeString(config.workspace_name),
      webhook_configured: typeof config.webhook_url === 'string' && config.webhook_url.trim().length > 0,
    }
  }

  return {
    from_name: safeString(config.from_name),
    from_email: safeString(config.from_email),
    reply_to: safeString(config.reply_to),
    label: safeString(config.label),
  }
}

function normalizeConnector(row: Record<string, unknown>, sanitize = true): WorkspaceAgentConnectorRecord {
  const provider = String(row.provider) as WorkspaceConnectorProvider
  const config = toRecord(row.config)

  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    provider,
    label: String(row.label ?? provider),
    status: (safeString(row.status) ?? 'connected') as WorkspaceConnectorStatus,
    capabilities: toStringArray(row.capabilities),
    config: sanitize ? sanitizeConnectorConfig(provider, config) : config,
    last_sync_at: safeString(row.last_sync_at),
    last_error: safeString(row.last_error),
    created_by: safeString(row.created_by),
    updated_by: safeString(row.updated_by),
    created_at: safeString(row.created_at) ?? new Date(0).toISOString(),
    updated_at: safeString(row.updated_at) ?? new Date(0).toISOString(),
  }
}

function normalizeAutomationRun(row: Record<string, unknown>): WorkspaceAutomationRunRecord {
  return {
    id: String(row.id),
    job_id: String(row.job_id),
    external_run_id: safeString(row.external_run_id),
    status: String(row.status ?? 'pending'),
    trigger_type: String(row.trigger_type ?? 'manual'),
    started_at: safeString(row.started_at),
    ended_at: safeString(row.ended_at),
    duration_ms: safeNumber(row.duration_ms),
    logs: toArray(row.logs),
    output: toRecord(row.output),
    error: safeString(row.error),
    trace: toRecord(row.trace),
    created_at: safeString(row.created_at) ?? new Date(0).toISOString(),
    updated_at: safeString(row.updated_at) ?? new Date(0).toISOString(),
  }
}

function normalizeAutomation(
  row: Record<string, unknown>,
  latestRun: WorkspaceAutomationRunRecord | null,
): WorkspaceAutomationRecord {
  const payload = toRecord(row.payload)
  const metadata = toRecord(row.metadata)
  const triggerType = (safeString(metadata.trigger_type) ??
    (safeString(row.job_type) === 'cron' ? 'schedule' : 'manual')) as WorkspaceAutomationRecord['trigger_type']

  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    name: String(row.name ?? 'Untitled automation'),
    description: safeString(row.description),
    enabled: Boolean(row.enabled ?? true),
    trigger_type: triggerType,
    event_name: safeString(metadata.event_name),
    schedule: safeString(row.schedule),
    entity_type: (safeString(payload.entity_type) ?? 'workspace') as WorkspaceThreadEntityType,
    entity_id: safeString(payload.entity_id),
    prompt: safeString(payload.prompt) ?? '',
    agent_id: safeString(payload.agent_id),
    writeback_mode: safeString(payload.writeback_mode),
    job_type: String(row.job_type ?? 'event_triggered'),
    last_status: safeString(row.last_status),
    last_run_at: safeString(row.last_run_at),
    metadata,
    latest_run: latestRun,
    created_at: safeString(row.created_at) ?? new Date(0).toISOString(),
    updated_at: safeString(row.updated_at) ?? new Date(0).toISOString(),
  }
}

async function logActivity(
  client: DataClient,
  workspaceId: string,
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  changes: Record<string, unknown>,
) {
  await client
    .from('activity_log')
    .insert({
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      user_id: userId,
      changes,
    })
}

export class WorkspaceAgentStudioService {
  constructor(private readonly client: DataClient) {}

  async listThreads(
    workspaceId: string,
    options?: {
      entityType?: WorkspaceThreadEntityType
      entityId?: string | null
      limit?: number
    },
  ): Promise<WorkspaceAgentThreadRecord[]> {
    let query = this.client
      .from('agent_threads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('last_message_at', { ascending: false })
      .limit(Math.min(options?.limit ?? 40, 100))

    if (options?.entityType) query = query.eq('entity_type', options.entityType)
    if (options?.entityId === null) query = query.is('entity_id', null)
    if (typeof options?.entityId === 'string') query = query.eq('entity_id', options.entityId)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list threads: ${error.message}`)
    return toArray<Record<string, unknown>>(data).map(normalizeThread)
  }

  async getThread(workspaceId: string, threadId: string): Promise<WorkspaceAgentThreadRecord | null> {
    const { data, error } = await this.client
      .from('agent_threads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', threadId)
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch thread: ${error.message}`)
    return data ? normalizeThread(data as Record<string, unknown>) : null
  }

  async createThread(
    workspaceId: string,
    userId: string,
    input: {
      entity_type: WorkspaceThreadEntityType
      entity_id?: string | null
      title: string
      agent_id?: string | null
      metadata?: Record<string, unknown>
    },
  ): Promise<WorkspaceAgentThreadRecord> {
    const payload = {
      workspace_id: workspaceId,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      title: input.title.trim(),
      agent_id: input.agent_id ?? null,
      metadata: input.metadata ?? {},
      created_by: userId,
      last_message_at: new Date().toISOString(),
    }

    const { data, error } = await this.client
      .from('agent_threads')
      .insert(payload)
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to create thread: ${error?.message ?? 'unknown error'}`)

    const thread = normalizeThread(data as Record<string, unknown>)
    await logActivity(this.client, workspaceId, 'agent_thread', thread.id, 'agent_thread.created', userId, {
      entity_type: thread.entity_type,
      entity_id: thread.entity_id,
      title: thread.title,
      agent_id: thread.agent_id,
    })
    return thread
  }

  async updateThread(
    workspaceId: string,
    userId: string,
    threadId: string,
    input: {
      title?: string
      status?: WorkspaceThreadStatus
      agent_id?: string | null
      metadata?: Record<string, unknown>
    },
  ): Promise<WorkspaceAgentThreadRecord> {
    const updatePayload: Record<string, unknown> = {}
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.agent_id !== undefined) updatePayload.agent_id = input.agent_id
    if (input.metadata !== undefined) updatePayload.metadata = input.metadata

    const { data, error } = await this.client
      .from('agent_threads')
      .update(updatePayload)
      .eq('workspace_id', workspaceId)
      .eq('id', threadId)
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to update thread: ${error?.message ?? 'unknown error'}`)
    const thread = normalizeThread(data as Record<string, unknown>)
    await logActivity(this.client, workspaceId, 'agent_thread', thread.id, 'agent_thread.updated', userId, updatePayload)
    return thread
  }

  async listThreadMessages(
    workspaceId: string,
    threadId: string,
    limit = 120,
  ): Promise<WorkspaceAgentThreadMessageRecord[]> {
    const { data, error } = await this.client
      .from('agent_thread_messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(Math.min(limit, 300))

    if (error) throw new Error(`Failed to fetch thread messages: ${error.message}`)
    return toArray<Record<string, unknown>>(data).map(normalizeThreadMessage)
  }

  async createThreadMessage(
    workspaceId: string,
    userId: string | null,
    threadId: string,
    input: {
      role: WorkspaceAgentThreadMessageRecord['role']
      content: string
      status?: WorkspaceAgentThreadMessageRecord['status']
      run_id?: string | null
      metadata?: Record<string, unknown>
    },
  ): Promise<WorkspaceAgentThreadMessageRecord> {
    const { data, error } = await this.client
      .from('agent_thread_messages')
      .insert({
        thread_id: threadId,
        workspace_id: workspaceId,
        role: input.role,
        content: input.content,
        status: input.status ?? 'posted',
        run_id: input.run_id ?? null,
        metadata: input.metadata ?? {},
        created_by: userId,
      })
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to create thread message: ${error?.message ?? 'unknown error'}`)

    await this.client
      .from('agent_threads')
      .update({ last_message_at: safeString((data as Record<string, unknown>).created_at) ?? new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', threadId)

    return normalizeThreadMessage(data as Record<string, unknown>)
  }

  async createRunWithThreadMessages(
    workspaceId: string,
    userId: string,
    input: {
      threadId: string
      agentId?: string | null
      task: string
      useCase: string
      entityType: WorkspaceThreadEntityType
      entityId?: string | null
      jobId?: string | null
      additionalContext?: Record<string, unknown>
    },
  ) {
    const userMessage = await this.createThreadMessage(workspaceId, userId, input.threadId, {
      role: 'user',
      content: input.task,
      status: 'completed',
      metadata: {
        agent_id: input.agentId ?? null,
      },
    })

    const { data: runRow, error: runError } = await this.client
      .from('runs')
      .insert({
        runner: 'openclaw',
        status: 'pending',
        summary: input.task.slice(0, 180),
        started_at: new Date().toISOString(),
        trace: {
          workspace_agent: {
            kind: 'thread',
            workspace_id: workspaceId,
            thread_id: input.threadId,
            entity_type: input.entityType,
            entity_id: input.entityId ?? null,
            agent_id: input.agentId ?? null,
            ai_use_case: input.useCase,
            ...toRecord(input.additionalContext),
          },
          command_surface: input.jobId
            ? {
                job_id: input.jobId,
                stream_state: 'queued',
                last_stream_event_at: new Date().toISOString(),
              }
            : {},
        },
      })
      .select('id, trace')
      .single()

    if (runError || !runRow) throw new Error(`Failed to create run: ${runError?.message ?? 'unknown error'}`)

    const assistantMessage = await this.createThreadMessage(workspaceId, userId, input.threadId, {
      role: 'assistant',
      content: 'OpenClaw is preparing the response.',
      status: 'pending',
      run_id: String((runRow as Record<string, unknown>).id),
      metadata: {
        agent_id: input.agentId ?? null,
        source: 'openclaw',
      },
    })

    const { error: traceError } = await this.client
      .from('runs')
      .update({
        trace: {
          ...toRecord((runRow as Record<string, unknown>).trace),
          workspace_agent: {
            ...toRecord(toRecord((runRow as Record<string, unknown>).trace).workspace_agent),
            placeholder_message_id: assistantMessage.id,
            user_message_id: userMessage.id,
          },
        },
      })
      .eq('id', String((runRow as Record<string, unknown>).id))

    if (traceError) throw new Error(`Failed to link run to thread messages: ${traceError.message}`)

    return {
      run_id: String((runRow as Record<string, unknown>).id),
      user_message: userMessage,
      assistant_message: assistantMessage,
    }
  }

  async listConnectors(
    workspaceId: string,
    options?: { includeSecrets?: boolean },
  ): Promise<WorkspaceAgentConnectorRecord[]> {
    const { data, error } = await this.client
      .from('workspace_agent_connectors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch workspace connectors: ${error.message}`)
    return toArray<Record<string, unknown>>(data).map((row) => normalizeConnector(row, options?.includeSecrets !== true))
  }

  async getConnector(
    workspaceId: string,
    connectorId: string,
    options?: { includeSecrets?: boolean },
  ): Promise<WorkspaceAgentConnectorRecord | null> {
    const { data, error } = await this.client
      .from('workspace_agent_connectors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', connectorId)
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch connector: ${error.message}`)
    return data ? normalizeConnector(data as Record<string, unknown>, options?.includeSecrets !== true) : null
  }

  async resolveConnectorByProvider(
    workspaceId: string,
    provider: WorkspaceConnectorProvider,
  ): Promise<WorkspaceAgentConnectorRecord | null> {
    const { data, error } = await this.client
      .from('workspace_agent_connectors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('status', 'connected')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Failed to resolve connector: ${error.message}`)
    return data ? normalizeConnector(data as Record<string, unknown>, false) : null
  }

  async upsertConnector(
    workspaceId: string,
    userId: string,
    input: {
      connectorId?: string
      provider: WorkspaceConnectorProvider
      label: string
      status?: WorkspaceConnectorStatus
      capabilities?: string[]
      config?: Record<string, unknown>
      last_error?: string | null
    },
  ): Promise<WorkspaceAgentConnectorRecord> {
    const payload = {
      workspace_id: workspaceId,
      provider: input.provider,
      label: input.label.trim(),
      status: input.status ?? 'connected',
      capabilities: input.capabilities ?? [],
      config: input.config ?? {},
      last_error: input.last_error ?? null,
      updated_by: userId,
      ...(input.connectorId ? {} : { created_by: userId }),
    }

    const query = input.connectorId
      ? this.client
          .from('workspace_agent_connectors')
          .update(payload)
          .eq('workspace_id', workspaceId)
          .eq('id', input.connectorId)
      : this.client
          .from('workspace_agent_connectors')
          .insert(payload)

    const { data, error } = await query
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to save connector: ${error?.message ?? 'unknown error'}`)

    const connector = normalizeConnector(data as Record<string, unknown>)
    await logActivity(this.client, workspaceId, 'workspace_connector', connector.id, input.connectorId ? 'workspace_connector.updated' : 'workspace_connector.created', userId, {
      provider: connector.provider,
      label: connector.label,
      status: connector.status,
      capabilities: connector.capabilities,
    })
    return connector
  }

  async deleteConnector(workspaceId: string, userId: string, connectorId: string): Promise<void> {
    const { error } = await this.client
      .from('workspace_agent_connectors')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', connectorId)

    if (error) throw new Error(`Failed to delete connector: ${error.message}`)
    await logActivity(this.client, workspaceId, 'workspace_connector', connectorId, 'workspace_connector.deleted', userId, {})
  }

  async listAutomations(
    workspaceId: string,
    options?: {
      entityType?: WorkspaceThreadEntityType
      entityId?: string | null
      limit?: number
    },
  ): Promise<WorkspaceAutomationRecord[]> {
    let query = this.client
      .from('automation_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('handler', 'workspace_agent')
      .order('updated_at', { ascending: false })
      .limit(Math.min(options?.limit ?? 40, 100))

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch workspace automations: ${error.message}`)

    const jobs = toArray<Record<string, unknown>>(data)
      .filter((row) => {
        const payload = toRecord(row.payload)
        if (options?.entityType && safeString(payload.entity_type) !== options.entityType) return false
        if (options?.entityId === null && payload.entity_id !== null && payload.entity_id !== undefined) return false
        if (typeof options?.entityId === 'string' && safeString(payload.entity_id) !== options.entityId) return false
        return true
      })

    if (jobs.length === 0) return []

    const jobIds = jobs.map((row) => String(row.id))
    const { data: runData, error: runError } = await this.client
      .from('automation_runs')
      .select('*')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(jobIds.length * 4)

    if (runError) throw new Error(`Failed to fetch automation runs: ${runError.message}`)

    const latestRuns = new Map<string, WorkspaceAutomationRunRecord>()
    for (const row of toArray<Record<string, unknown>>(runData)) {
      const normalized = normalizeAutomationRun(row)
      if (!latestRuns.has(normalized.job_id)) latestRuns.set(normalized.job_id, normalized)
    }

    return jobs.map((row) => normalizeAutomation(row, latestRuns.get(String(row.id)) ?? null))
  }

  async createAutomation(
    workspaceId: string,
    userId: string,
    input: {
      name: string
      description?: string | null
      trigger_type: WorkspaceAutomationRecord['trigger_type']
      event_name?: string | null
      schedule?: string | null
      entity_type?: WorkspaceThreadEntityType
      entity_id?: string | null
      prompt: string
      agent_id?: string | null
      writeback_mode?: string | null
      enabled?: boolean
      metadata?: Record<string, unknown>
    },
  ): Promise<WorkspaceAutomationRecord> {
    const jobType = input.trigger_type === 'schedule' ? 'cron' : 'event_triggered'
    const { data, error } = await this.client
      .from('automation_jobs')
      .insert({
        workspace_id: workspaceId,
        name: input.name.trim(),
        description: input.description ?? null,
        job_type: jobType,
        schedule: input.trigger_type === 'schedule' ? input.schedule ?? null : null,
        enabled: input.enabled ?? true,
        handler: 'workspace_agent',
        payload: {
          prompt: input.prompt.trim(),
          agent_id: input.agent_id ?? null,
          entity_type: input.entity_type ?? 'workspace',
          entity_id: input.entity_id ?? null,
          writeback_mode: input.writeback_mode ?? 'page_append',
        },
        policy: {
          ai_use_case: 'workspace_automation',
        },
        metadata: {
          kind: 'workspace_agent',
          trigger_type: input.trigger_type,
          event_name: input.event_name ?? null,
          created_by: userId,
          ...toRecord(input.metadata),
        },
        last_status: 'pending',
      })
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to create automation: ${error?.message ?? 'unknown error'}`)
    const automation = normalizeAutomation(data as Record<string, unknown>, null)
    await logActivity(this.client, workspaceId, 'workspace_automation', automation.id, 'workspace_automation.created', userId, {
      trigger_type: automation.trigger_type,
      entity_type: automation.entity_type,
      entity_id: automation.entity_id,
    })
    return automation
  }

  async updateAutomation(
    workspaceId: string,
    userId: string,
    automationId: string,
    input: {
      name?: string
      description?: string | null
      trigger_type?: WorkspaceAutomationRecord['trigger_type']
      event_name?: string | null
      schedule?: string | null
      entity_type?: WorkspaceThreadEntityType
      entity_id?: string | null
      prompt?: string
      agent_id?: string | null
      writeback_mode?: string | null
      enabled?: boolean
      metadata?: Record<string, unknown>
    },
  ): Promise<WorkspaceAutomationRecord> {
    const { data: existing, error: existingError } = await this.client
      .from('automation_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', automationId)
      .eq('handler', 'workspace_agent')
      .maybeSingle()

    if (existingError) throw new Error(`Failed to fetch automation: ${existingError.message}`)
    if (!existing) throw new Error('Automation not found')

    const existingPayload = toRecord((existing as Record<string, unknown>).payload)
    const existingMetadata = toRecord((existing as Record<string, unknown>).metadata)
    const triggerType = input.trigger_type ?? (safeString(existingMetadata.trigger_type) as WorkspaceAutomationRecord['trigger_type'] ?? 'manual')
    const jobType = triggerType === 'schedule' ? 'cron' : 'event_triggered'

    const { data, error } = await this.client
      .from('automation_jobs')
      .update({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        job_type: jobType,
        schedule: triggerType === 'schedule' ? input.schedule ?? safeString(existing.schedule) : null,
        payload: {
          ...existingPayload,
          ...(input.prompt !== undefined ? { prompt: input.prompt.trim() } : {}),
          ...(input.agent_id !== undefined ? { agent_id: input.agent_id } : {}),
          ...(input.entity_type !== undefined ? { entity_type: input.entity_type } : {}),
          ...(input.entity_id !== undefined ? { entity_id: input.entity_id } : {}),
          ...(input.writeback_mode !== undefined ? { writeback_mode: input.writeback_mode } : {}),
        },
        metadata: {
          ...existingMetadata,
          trigger_type: triggerType,
          event_name: input.event_name ?? safeString(existingMetadata.event_name),
          ...toRecord(input.metadata),
        },
      })
      .eq('workspace_id', workspaceId)
      .eq('id', automationId)
      .select('*')
      .single()

    if (error || !data) throw new Error(`Failed to update automation: ${error?.message ?? 'unknown error'}`)
    const automation = normalizeAutomation(data as Record<string, unknown>, null)
    await logActivity(this.client, workspaceId, 'workspace_automation', automation.id, 'workspace_automation.updated', userId, {
      trigger_type: automation.trigger_type,
      enabled: automation.enabled,
    })
    return automation
  }

  async deleteAutomation(workspaceId: string, userId: string, automationId: string): Promise<void> {
    const { error } = await this.client
      .from('automation_jobs')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', automationId)
      .eq('handler', 'workspace_agent')

    if (error) throw new Error(`Failed to delete automation: ${error.message}`)
    await logActivity(this.client, workspaceId, 'workspace_automation', automationId, 'workspace_automation.deleted', userId, {})
  }

  async createAutomationRun(
    workspaceId: string,
    userId: string,
    input: {
      automationId: string
      triggerType?: string
      jobId?: string | null
      additionalContext?: Record<string, unknown>
    },
  ) {
    const { data: job, error: jobError } = await this.client
      .from('automation_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', input.automationId)
      .eq('handler', 'workspace_agent')
      .maybeSingle()

    if (jobError) throw new Error(`Failed to fetch automation for run: ${jobError.message}`)
    if (!job) throw new Error('Automation not found')

    const payload = toRecord((job as Record<string, unknown>).payload)
    const metadata = toRecord((job as Record<string, unknown>).metadata)
    const triggerType = input.triggerType ?? safeString(metadata.trigger_type) ?? 'manual'
    const startedAt = new Date().toISOString()

    const { data: automationRun, error: automationRunError } = await this.client
      .from('automation_runs')
      .insert({
        job_id: input.automationId,
        status: 'pending',
        trigger_type: triggerType,
        started_at: startedAt,
        trace: {
          workspace_agent: {
            workspace_id: workspaceId,
            automation_id: input.automationId,
            triggered_by: userId,
            ...toRecord(input.additionalContext),
          },
        },
      })
      .select('*')
      .single()

    if (automationRunError || !automationRun) {
      throw new Error(`Failed to create automation run: ${automationRunError?.message ?? 'unknown error'}`)
    }

    const { data: runRow, error: runError } = await this.client
      .from('runs')
      .insert({
        runner: 'openclaw',
        status: 'pending',
        summary: String((job as Record<string, unknown>).name ?? 'Workspace automation'),
        started_at: startedAt,
        trace: {
          workspace_agent: {
            kind: 'automation',
            workspace_id: workspaceId,
            automation_id: input.automationId,
            automation_run_id: String((automationRun as Record<string, unknown>).id),
            entity_type: safeString(payload.entity_type) ?? 'workspace',
            entity_id: safeString(payload.entity_id),
            agent_id: safeString(payload.agent_id),
            ai_use_case: 'workspace_automation',
            ...toRecord(input.additionalContext),
          },
          command_surface: input.jobId
            ? {
                job_id: input.jobId,
                stream_state: 'queued',
                last_stream_event_at: startedAt,
              }
            : {},
        },
      })
      .select('id')
      .single()

    if (runError || !runRow) throw new Error(`Failed to create automation run record: ${runError?.message ?? 'unknown error'}`)

    await this.client
      .from('automation_runs')
      .update({
        trace: {
          ...toRecord((automationRun as Record<string, unknown>).trace),
          workspace_agent: {
            ...toRecord(toRecord((automationRun as Record<string, unknown>).trace).workspace_agent),
            run_id: String((runRow as Record<string, unknown>).id),
          },
        },
      })
      .eq('id', String((automationRun as Record<string, unknown>).id))

    await this.client
      .from('automation_jobs')
      .update({
        last_status: 'pending',
        last_run_at: startedAt,
      })
      .eq('id', input.automationId)

    return {
      automation: normalizeAutomation(job as Record<string, unknown>, null),
      automation_run: normalizeAutomationRun(automationRun as Record<string, unknown>),
      run_id: String((runRow as Record<string, unknown>).id),
    }
  }
}
