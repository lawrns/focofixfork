import path from 'node:path'
import { ToolExecutor } from '@/lib/ai/tool-executor'
import { normalizeWorkspaceAIPolicy, type AIUseCase, type ToolMode, type WorkspaceAIPolicy } from '@/lib/ai/policy'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { isError } from '@/lib/repositories/base-repository'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { supabaseAdmin } from '@/lib/supabase-server'

const DEFAULT_APP_URL = 'http://127.0.0.1:4000'

const VALID_AI_USE_CASES = new Set<AIUseCase>([
  'task_action',
  'project_parsing',
  'command_surface_plan',
  'command_surface_execute',
  'command_surface_review',
  'workspace_plan',
  'workspace_execute',
  'workspace_review',
  'workspace_automation',
  'pipeline_plan',
  'pipeline_execute',
  'pipeline_review',
  'prompt_optimization',
  'cofounder_evaluation',
  'custom_agent_run',
])

export interface OpenClawBridgeDetails {
  available: boolean
  base_url: string
  manifest_url: string
  execute_url: string
  cli_path: string
  workspace_id: string
  actor_user_id: string
  use_case: AIUseCase
  agent_id?: string | null
  preferred_transport: 'cli'
  suggested_tools: string[]
}

function resolveAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_URL ??
    DEFAULT_APP_URL

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '')
  return `https://${raw.replace(/\/$/, '')}`
}

function resolveCliPath(): string {
  return path.join(process.cwd(), 'scripts', 'openclaw-foco-tool.mjs')
}

export function normalizeAIUseCase(value: unknown, fallback: AIUseCase = 'command_surface_execute'): AIUseCase {
  return typeof value === 'string' && VALID_AI_USE_CASES.has(value as AIUseCase)
    ? value as AIUseCase
    : fallback
}

export function buildOpenClawBridgeDetails(args: {
  workspaceId: string
  actorUserId: string
  useCase?: AIUseCase
  agentId?: string | null
}): OpenClawBridgeDetails {
  const baseUrl = resolveAppBaseUrl()
  const manifestUrl = `${baseUrl}/api/openclaw/tools/manifest`
  const executeUrl = `${baseUrl}/api/openclaw/tools/execute`

  return {
    available: true,
    base_url: baseUrl,
    manifest_url: manifestUrl,
    execute_url: executeUrl,
    cli_path: resolveCliPath(),
    workspace_id: args.workspaceId,
    actor_user_id: args.actorUserId,
    use_case: args.useCase ?? 'command_surface_execute',
    agent_id: args.agentId ?? null,
    preferred_transport: 'cli',
    suggested_tools: [
      'search_workspace',
      'get_page',
      'query_database',
      'list_connectors',
      'search_mail',
      'create_page',
      'append_blocks',
      'create_database',
      'upsert_database_row',
      'send_mail',
      'post_slack_message',
    ],
  }
}

export function buildOpenClawBridgePrompt(details: OpenClawBridgeDetails): string {
  const agentFlag = details.agent_id ? ` --agent ${details.agent_id}` : ''

  return [
    'Foco workspace tool bridge is available for this run.',
    'Use it for workspace reads and writes instead of direct SQL, direct table edits, or ad hoc filesystem approximations.',
    `Inspect allowed tools first: node ${details.cli_path} manifest --workspace ${details.workspace_id} --user ${details.actor_user_id} --base-url ${details.base_url} --use-case ${details.use_case}${agentFlag}`,
    `Execute a tool: node ${details.cli_path} exec <tool_name> '<json-args>' --workspace ${details.workspace_id} --user ${details.actor_user_id} --base-url ${details.base_url} --use-case ${details.use_case}${agentFlag}`,
    `Prefer these tools when relevant: ${details.suggested_tools.join(', ')}.`,
    'Keep workspace mutations inside the bridge so policy checks, revision history, and audit logging are preserved.',
  ].join('\n')
}

function applyExecutionProfileToPolicy(
  policy: WorkspaceAIPolicy,
  args: {
    allowedTools: string[]
    toolMode: ToolMode
    approvalRequired: boolean
    agentId?: string | null
  }
): WorkspaceAIPolicy {
  const nextPolicy = normalizeWorkspaceAIPolicy(policy)

  nextPolicy.allowed_tools = args.allowedTools
  nextPolicy.constraints = {
    ...nextPolicy.constraints,
    require_approval_for_changes: args.approvalRequired,
  }

  if (args.agentId) {
    const agentOverride = nextPolicy.agent_profiles?.[args.agentId]
    if (agentOverride?.allowed_tools && agentOverride.allowed_tools.length > 0) {
      nextPolicy.allowed_tools = agentOverride.allowed_tools
    }
    if (agentOverride?.tool_mode === 'none') {
      nextPolicy.allowed_tools = []
    }
  }

  if (args.toolMode === 'none') {
    nextPolicy.allowed_tools = []
  }

  return nextPolicy
}

export async function resolveOpenClawToolExecutionContext(args: {
  workspaceId: string
  actorUserId: string
  useCase?: AIUseCase
  agentId?: string | null
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client unavailable')
  }

  const repo = new WorkspaceRepository(supabaseAdmin)
  const membership = await repo.isMember(args.workspaceId, args.actorUserId)
  if (isError(membership)) {
    throw new Error(membership.error.message)
  }
  if (!membership.data) {
    throw new Error('Actor does not have access to this workspace')
  }

  const useCase = args.useCase ?? 'command_surface_execute'
  const { policy, profile } = await resolveAIExecutionProfileFromWorkspace({
    supabase: supabaseAdmin,
    userId: args.actorUserId,
    workspaceId: args.workspaceId,
    useCase,
    customAgentId: args.agentId ?? undefined,
  })

  const effectivePolicy = applyExecutionProfileToPolicy(policy, {
    allowedTools: profile.capability_manifest.allowed_tools,
    toolMode: profile.capability_manifest.tool_mode,
    approvalRequired: profile.approval_mode === 'approval_required',
    agentId: args.agentId,
  })

  return {
    useCase,
    aiPolicy: effectivePolicy,
    bridge: buildOpenClawBridgeDetails({
      workspaceId: args.workspaceId,
      actorUserId: args.actorUserId,
      useCase,
      agentId: args.agentId,
    }),
  }
}

export function buildOpenClawBridgeManifest(args: {
  workspaceId: string
  actorUserId: string
  useCase: AIUseCase
  agentId?: string | null
  aiPolicy: WorkspaceAIPolicy
}) {
  const executor = new ToolExecutor()
  const tools = executor
    .listTools()
    .filter((tool) => args.aiPolicy.allowed_tools.includes('*') || args.aiPolicy.allowed_tools.includes(tool.name))
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      schema: tool.schema ?? null,
    }))

  return {
    bridge: buildOpenClawBridgeDetails({
      workspaceId: args.workspaceId,
      actorUserId: args.actorUserId,
      useCase: args.useCase,
      agentId: args.agentId,
    }),
    allowed_tools: args.aiPolicy.allowed_tools,
    constraints: args.aiPolicy.constraints ?? {},
    tools,
  }
}
