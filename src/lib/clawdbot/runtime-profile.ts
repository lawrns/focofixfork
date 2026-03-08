import type { SupabaseClient } from '@supabase/supabase-js'

export interface ClawdbotRuntimeProfile {
  id?: string
  user_id: string
  workspace_id: string | null
  project_id: string | null
  agent_backend: 'clawdbot'
  agent_key: string
  display_name: string
  scope_key: string
  active: boolean
  model_preference: string | null
  tool_mode: 'sandbox' | 'gateway' | 'full'
  bootstrap_files: string[]
  memory_scope: Record<string, unknown>
  session_scope: Record<string, unknown>
  permissions: Record<string, unknown>
  channel_routing: Record<string, unknown>
  metadata: Record<string, unknown>
  last_activity_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface RuntimeProfileInput {
  userId: string
  workspaceId?: string | null
  projectId?: string | null
  agentKey?: string
  displayName?: string
  modelPreference?: string | null
  toolMode?: 'sandbox' | 'gateway' | 'full'
  bootstrapFiles?: string[]
  memoryScope?: Record<string, unknown>
  sessionScope?: Record<string, unknown>
  permissions?: Record<string, unknown>
  channelRouting?: Record<string, unknown>
  metadata?: Record<string, unknown>
  active?: boolean
}

const DEFAULT_BOOTSTRAP_FILES = ['FOUNDER_PROFILE.md', 'AGENTS.md', 'SOUL.md', 'USER.md', 'TOOLS.md']
const DEFAULT_MEMORY_SCOPE = {
  strategy: 'founder-profile',
  long_term: ['MEMORY.md'],
  daily_logs: 'YYYY-MM-DD.md',
}
const DEFAULT_SESSION_SCOPE = {
  dm_scope: 'per-channel-peer',
  memory_flush_before_compaction: true,
  compaction_mode: 'preserve-decisions-first',
}
const DEFAULT_PERMISSIONS = {
  exec_mode: 'gateway',
  allow_git_branch_push: true,
  allow_default_branch_writes: false,
}

export function buildRuntimeScopeKey(workspaceId?: string | null, projectId?: string | null): string {
  if (workspaceId && projectId) return `workspace:${workspaceId}:project:${projectId}`
  if (workspaceId) return `workspace:${workspaceId}:default`
  return 'global:default'
}

export function buildDefaultClawdbotRuntimeProfile(input: RuntimeProfileInput): ClawdbotRuntimeProfile {
  const workspaceId = input.workspaceId ?? null
  const projectId = input.projectId ?? null
  return {
    user_id: input.userId,
    workspace_id: workspaceId,
    project_id: projectId,
    agent_backend: 'clawdbot',
    agent_key: input.agentKey ?? 'clawdbot',
    display_name: input.displayName ?? 'ClawdBot',
    scope_key: buildRuntimeScopeKey(workspaceId, projectId),
    active: input.active ?? true,
    model_preference: input.modelPreference ?? null,
    tool_mode: input.toolMode ?? 'gateway',
    bootstrap_files: input.bootstrapFiles ?? DEFAULT_BOOTSTRAP_FILES,
    memory_scope: input.memoryScope ?? DEFAULT_MEMORY_SCOPE,
    session_scope: input.sessionScope ?? DEFAULT_SESSION_SCOPE,
    permissions: input.permissions ?? DEFAULT_PERMISSIONS,
    channel_routing: input.channelRouting ?? {},
    metadata: input.metadata ?? {},
  }
}

function normalizeRuntimeRow(row: Record<string, unknown> | null | undefined): ClawdbotRuntimeProfile | null {
  if (!row) return null
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    user_id: String(row.user_id ?? ''),
    workspace_id: typeof row.workspace_id === 'string' ? row.workspace_id : null,
    project_id: typeof row.project_id === 'string' ? row.project_id : null,
    agent_backend: 'clawdbot',
    agent_key: typeof row.agent_key === 'string' ? row.agent_key : 'clawdbot',
    display_name: typeof row.display_name === 'string' ? row.display_name : 'ClawdBot',
    scope_key: typeof row.scope_key === 'string' ? row.scope_key : buildRuntimeScopeKey(
      typeof row.workspace_id === 'string' ? row.workspace_id : null,
      typeof row.project_id === 'string' ? row.project_id : null,
    ),
    active: typeof row.active === 'boolean' ? row.active : true,
    model_preference: typeof row.model_preference === 'string' ? row.model_preference : null,
    tool_mode: row.tool_mode === 'sandbox' || row.tool_mode === 'full' ? row.tool_mode : 'gateway',
    bootstrap_files: Array.isArray(row.bootstrap_files) ? row.bootstrap_files.filter((value): value is string => typeof value === 'string') : DEFAULT_BOOTSTRAP_FILES,
    memory_scope: row.memory_scope && typeof row.memory_scope === 'object' ? row.memory_scope as Record<string, unknown> : DEFAULT_MEMORY_SCOPE,
    session_scope: row.session_scope && typeof row.session_scope === 'object' ? row.session_scope as Record<string, unknown> : DEFAULT_SESSION_SCOPE,
    permissions: row.permissions && typeof row.permissions === 'object' ? row.permissions as Record<string, unknown> : DEFAULT_PERMISSIONS,
    channel_routing: row.channel_routing && typeof row.channel_routing === 'object' ? row.channel_routing as Record<string, unknown> : {},
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {},
    last_activity_at: typeof row.last_activity_at === 'string' ? row.last_activity_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  }
}

export async function resolveClawdbotRuntimeProfile(
  supabase: SupabaseClient,
  input: RuntimeProfileInput
): Promise<ClawdbotRuntimeProfile> {
  const projectScopeKey = buildRuntimeScopeKey(input.workspaceId, input.projectId)
  const workspaceScopeKey = buildRuntimeScopeKey(input.workspaceId, null)
  const agentKey = input.agentKey ?? 'clawdbot'

  const { data, error } = await supabase
    .from('agent_runtime_profiles')
    .select('*')
    .eq('user_id', input.userId)
    .eq('agent_backend', 'clawdbot')
    .eq('agent_key', agentKey)
    .in('scope_key', input.projectId ? [projectScopeKey, workspaceScopeKey] : [workspaceScopeKey])
    .order('project_id', { ascending: false, nullsFirst: false })
    .limit(2)

  if (error || !data || data.length === 0) {
    return buildDefaultClawdbotRuntimeProfile(input)
  }

  return normalizeRuntimeRow(data[0] as Record<string, unknown>) ?? buildDefaultClawdbotRuntimeProfile(input)
}

export async function upsertClawdbotRuntimeProfile(
  supabase: SupabaseClient,
  input: RuntimeProfileInput
): Promise<ClawdbotRuntimeProfile> {
  const base = buildDefaultClawdbotRuntimeProfile(input)
  const payload = {
    ...base,
    last_activity_at: input.metadata?.last_activity_at ?? null,
  }

  const { data, error } = await supabase
    .from('agent_runtime_profiles')
    .upsert(payload, {
      onConflict: 'user_id,scope_key,agent_backend,agent_key',
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to upsert runtime profile')
  }

  return normalizeRuntimeRow(data as Record<string, unknown>) ?? base
}

export function summarizeRuntimeProfile(profile: ClawdbotRuntimeProfile) {
  return {
    agentKey: profile.agent_key,
    displayName: profile.display_name,
    modelPreference: profile.model_preference,
    toolMode: profile.tool_mode,
    bootstrapFiles: profile.bootstrap_files,
    dmScope: profile.session_scope?.dm_scope ?? 'per-channel-peer',
    memoryFlushBeforeCompaction: profile.session_scope?.memory_flush_before_compaction !== false,
    permissions: profile.permissions,
    channelRouting: profile.channel_routing,
  }
}
