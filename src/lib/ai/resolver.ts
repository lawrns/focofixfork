import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveClawdRoutingProfile } from '@/lib/clawdbot/routing'
import type { CustomAgentProfileRow } from '@/lib/agent-ops/types'
import {
  DEFAULT_WORKSPACE_AI_POLICY,
  normalizeWorkspaceAIPolicy,
  type AIExecutionProfile,
  type AIModelProfile,
  type AIPromptProfile,
  type AIToolProfile,
  type AIUseCase,
  type AIProvider,
  type WorkspaceAIPolicy,
} from './policy'

interface ResolveProfileOptions {
  useCase: AIUseCase
  policy?: WorkspaceAIPolicy | null
  requestedModel?: string | null
  requestedFallbackChain?: string[] | null
  customAgent?: Pick<CustomAgentProfileRow, 'id' | 'slug' | 'system_prompt' | 'tool_access'> | null
}

interface ResolveProfileDbOptions {
  supabase: SupabaseClient
  userId: string
  workspaceId?: string | null
  useCase: AIUseCase
  requestedModel?: string | null
  requestedFallbackChain?: string[] | null
  customAgentId?: string | null
}

function getEnvProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER
  return provider === 'openai' || provider === 'deepseek' || provider === 'glm' || provider === 'anthropic' || provider === 'ollama' ? provider : 'glm'
}

function getEnvDefaultModel(provider: AIProvider): string {
  if (provider === 'openai') return process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini'
  if (provider === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-opus-4-6'
  if (provider === 'deepseek') return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  if (provider === 'ollama') return 'ollama-qwen3.5'
  return process.env.GLM_MODEL || 'glm-5'
}

async function getRoutingDefault(useCase: AIUseCase): Promise<Partial<AIExecutionProfile>> {
  if (!useCase.startsWith('command_surface_') && !useCase.startsWith('pipeline_')) {
    return {}
  }

  const routing = await resolveClawdRoutingProfile(null)
  const model =
    useCase.endsWith('_plan') ? routing.plan_model
    : useCase.endsWith('_execute') ? routing.execute_model
    : routing.review_model

  return {
    model,
    fallback_chain: routing.fallback_chain,
    routing_profile_id: routing.profile_id,
    source: 'routing_profile',
  }
}

function defaultPromptInstructions(useCase: AIUseCase, policy: WorkspaceAIPolicy): string[] {
  if (useCase !== 'task_action') return []
  return [
    policy.task_prompts.task_generation,
    policy.task_prompts.task_analysis,
    policy.task_prompts.prioritization,
  ].filter(Boolean)
}

function derivePromptProfile(
  useCase: AIUseCase,
  policy: WorkspaceAIPolicy
): AIPromptProfile {
  return policy.prompt_profiles?.[useCase] ?? {
    system_instructions: policy.system_instructions,
    prompt_instructions: defaultPromptInstructions(useCase, policy).join('\n\n'),
  }
}

function deriveToolProfile(
  useCase: AIUseCase,
  policy: WorkspaceAIPolicy
): AIToolProfile {
  return policy.tool_profiles?.[useCase] ?? {
    tool_mode: policy.allowed_tools.length > 0 ? 'llm_tools_only' : 'none',
    allowed_tools: policy.allowed_tools,
  }
}

function buildAgentOverride(
  customAgent?: Pick<CustomAgentProfileRow, 'id' | 'slug' | 'system_prompt' | 'tool_access'> | null,
  policy?: WorkspaceAIPolicy | null
) {
  if (!customAgent) return null

  const policyOverride =
    (policy?.agent_profiles?.[customAgent.id]) ??
    (policy?.agent_profiles?.[customAgent.slug]) ??
    null

  const toolAccess = customAgent.tool_access && typeof customAgent.tool_access === 'object'
    ? customAgent.tool_access as Record<string, unknown>
    : {}

  return {
    ...policyOverride,
    allowed_tools: Array.isArray(toolAccess.allowed_tools)
      ? toolAccess.allowed_tools.filter((item): item is string => typeof item === 'string')
      : policyOverride?.allowed_tools,
    tool_mode: typeof toolAccess.tool_mode === 'string'
      ? toolAccess.tool_mode as AIExecutionProfile['capability_manifest']['tool_mode']
      : policyOverride?.tool_mode,
    system_prompt: customAgent.system_prompt || policyOverride?.system_prompt,
  }
}

export async function resolveAIExecutionProfile(
  options: ResolveProfileOptions
): Promise<AIExecutionProfile> {
  const policy = normalizeWorkspaceAIPolicy(options.policy ?? DEFAULT_WORKSPACE_AI_POLICY)
  const envProvider = getEnvProvider()
  const routingDefault = await getRoutingDefault(options.useCase)
  const modelProfile: AIModelProfile = policy.model_profiles?.[options.useCase] ?? {}
  const promptProfile = derivePromptProfile(options.useCase, policy)
  const toolProfile = deriveToolProfile(options.useCase, policy)
  const agentOverride = buildAgentOverride(options.customAgent, policy)

  let source: AIExecutionProfile['source'] = 'env'
  if (routingDefault.model) source = 'routing_profile'
  if (modelProfile.model || modelProfile.provider) source = 'workspace_policy'
  if (agentOverride?.model || agentOverride?.provider || agentOverride?.system_prompt) source = 'agent_profile'
  if (options.requestedModel?.trim()) source = 'override'

  const provider = agentOverride?.provider ?? modelProfile.provider ?? envProvider
  const model =
    options.requestedModel?.trim() ||
    agentOverride?.model ||
    modelProfile.model ||
    routingDefault.model ||
    getEnvDefaultModel(provider)

  const handbookSlugs = [
    ...(promptProfile.handbook_slugs ?? []),
    ...(policy.skills_policy?.use_case_handbooks?.[options.useCase] ?? []),
    ...(agentOverride?.handbook_slugs ?? []),
  ].filter((value, index, all) => value && all.indexOf(value) === index)

  const systemPromptSegments = [
    promptProfile.system_instructions,
    promptProfile.prompt_instructions,
    agentOverride?.system_prompt,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  return {
    use_case: options.useCase,
    provider,
    model,
    temperature: agentOverride?.temperature ?? modelProfile.temperature ?? 0.7,
    max_tokens:
      agentOverride?.max_tokens ??
      modelProfile.max_tokens ??
      policy.constraints?.max_tokens_per_request ??
      2000,
    fallback_chain:
      options.requestedFallbackChain?.length
        ? options.requestedFallbackChain
        : options.requestedModel?.trim()
          ? []
        : agentOverride?.fallback_chain ??
          modelProfile.fallback_chain ??
          routingDefault.fallback_chain ??
          [],
    capability_manifest: {
      tool_mode: agentOverride?.tool_mode ?? toolProfile.tool_mode ?? 'none',
      allowed_tools: agentOverride?.allowed_tools ?? toolProfile.allowed_tools ?? [],
      handbook_slugs: handbookSlugs,
    },
    system_prompt_segments: systemPromptSegments,
    approval_mode: policy.constraints?.require_approval_for_changes ? 'approval_required' : 'auto',
    source,
    routing_profile_id: routingDefault.routing_profile_id ?? null,
    workspace_policy_version: policy.version ?? 1,
    metadata: {
      agent_override_source: options.customAgent?.id ?? null,
    },
  }
}

export async function resolveAIExecutionProfileFromWorkspace(
  options: ResolveProfileDbOptions
): Promise<{ profile: AIExecutionProfile; policy: WorkspaceAIPolicy }> {
  let policy = DEFAULT_WORKSPACE_AI_POLICY
  let customAgent: Pick<CustomAgentProfileRow, 'id' | 'slug' | 'system_prompt' | 'tool_access'> | null = null

  if (options.workspaceId) {
    const { data: workspace } = await options.supabase
      .from('foco_workspaces')
      .select('ai_policy')
      .eq('id', options.workspaceId)
      .maybeSingle<{ ai_policy: Record<string, unknown> | null }>()

    policy = normalizeWorkspaceAIPolicy(workspace?.ai_policy)
  }

  if (options.customAgentId) {
    const query = options.supabase
      .from('custom_agent_profiles')
      .select('id, slug, system_prompt, tool_access')
      .eq('id', options.customAgentId)
      .eq('user_id', options.userId)

    const { data } = options.workspaceId
      ? await query.eq('workspace_id', options.workspaceId).maybeSingle()
      : await query.maybeSingle()

    customAgent = data as typeof customAgent
  }

  const profile = await resolveAIExecutionProfile({
    useCase: options.useCase,
    policy,
    requestedModel: options.requestedModel,
    requestedFallbackChain: options.requestedFallbackChain,
    customAgent,
  })

  return { profile, policy }
}
