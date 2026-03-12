export type AIProvider = 'openai' | 'deepseek' | 'glm' | 'anthropic' | 'ollama'

export type AIUseCase =
  | 'task_action'
  | 'project_parsing'
  | 'command_surface_plan'
  | 'command_surface_execute'
  | 'command_surface_review'
  | 'workspace_plan'
  | 'workspace_execute'
  | 'workspace_review'
  | 'workspace_automation'
  | 'pipeline_plan'
  | 'pipeline_execute'
  | 'pipeline_review'
  | 'prompt_optimization'
  | 'cofounder_evaluation'
  | 'custom_agent_run'

export type ToolMode = 'none' | 'llm_tools_only' | 'surfaces_only' | 'llm_tools_and_surfaces'

export interface AIModelProfile {
  provider?: AIProvider
  model?: string
  temperature?: number
  max_tokens?: number
  fallback_chain?: string[]
}

export interface AIToolProfile {
  tool_mode?: ToolMode
  allowed_tools?: string[]
}

export interface AIPromptProfile {
  system_instructions?: string
  prompt_instructions?: string
  handbook_slugs?: string[]
}

export interface AIAgentProfileOverride {
  provider?: AIProvider
  model?: string
  temperature?: number
  max_tokens?: number
  fallback_chain?: string[]
  tool_mode?: ToolMode
  allowed_tools?: string[]
  system_prompt?: string
  handbook_slugs?: string[]
}

export interface WorkspaceAIPolicy {
  system_instructions: string
  task_prompts: {
    task_generation: string
    task_analysis: string
    prioritization: string
  }
  allowed_tools: string[]
  allowed_actions: string[]
  auto_apply: boolean
  confidence_threshold: number
  execution_mode?: 'auto' | 'semi_auto'
  approval_thresholds?: {
    confidence_min_for_auto?: number
  }
  data_sources: string[]
  audit_visible: boolean
  constraints?: {
    allow_task_creation?: boolean
    allow_task_updates?: boolean
    allow_task_deletion?: boolean
    allow_project_access?: boolean
    allow_team_access?: boolean
    require_approval_for_changes?: boolean
    max_tasks_per_operation?: number
    max_tokens_per_request?: number
  }
  model_profiles?: Partial<Record<AIUseCase, AIModelProfile>>
  tool_profiles?: Partial<Record<AIUseCase, AIToolProfile>>
  prompt_profiles?: Partial<Record<AIUseCase, AIPromptProfile>>
  agent_profiles?: Record<string, AIAgentProfileOverride>
  skills_policy?: {
    use_case_handbooks?: Partial<Record<AIUseCase, string[]>>
    allow_workspace_handbooks?: boolean
  }
  audit_level?: 'minimal' | 'standard' | 'full'
  version?: number
  last_updated_by?: string
  last_updated_at?: string
}

export interface CapabilityManifest {
  tool_mode: ToolMode
  allowed_tools: string[]
  handbook_slugs: string[]
}

export interface AIExecutionProfile {
  use_case: AIUseCase
  provider: AIProvider
  model: string
  temperature: number
  max_tokens: number
  fallback_chain: string[]
  capability_manifest: CapabilityManifest
  system_prompt_segments: string[]
  approval_mode: 'auto' | 'approval_required'
  source: 'override' | 'agent_profile' | 'workspace_policy' | 'routing_profile' | 'env'
  routing_profile_id?: string | null
  workspace_policy_version: number
  metadata: {
    agent_override_source?: string | null
  }
}

export const DEFAULT_WORKSPACE_AI_POLICY: WorkspaceAIPolicy = {
  system_instructions: '',
  task_prompts: {
    task_generation: '',
    task_analysis: '',
    prioritization: '',
  },
  allowed_tools: ['query_tasks', 'get_task_details', 'get_project_overview', 'search_workspace', 'get_page', 'query_database', 'list_connectors', 'search_mail'],
  allowed_actions: ['suggest'],
  auto_apply: false,
  confidence_threshold: 0.8,
  execution_mode: 'auto',
  approval_thresholds: {
    confidence_min_for_auto: 0.75,
  },
  data_sources: ['tasks', 'comments', 'docs', 'blocks', 'databases'],
  audit_visible: true,
  constraints: {
    allow_task_creation: true,
    allow_task_updates: true,
    allow_task_deletion: false,
    allow_project_access: true,
    allow_team_access: true,
    require_approval_for_changes: false,
    max_tasks_per_operation: 100,
    max_tokens_per_request: 4096,
  },
  model_profiles: {},
  tool_profiles: {},
  prompt_profiles: {},
  agent_profiles: {},
  skills_policy: {
    use_case_handbooks: {},
    allow_workspace_handbooks: true,
  },
  audit_level: 'standard',
  version: 1,
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizePromptProfiles(raw: Record<string, unknown>): WorkspaceAIPolicy['prompt_profiles'] {
  const promptProfiles: WorkspaceAIPolicy['prompt_profiles'] = {}
  for (const [useCase, value] of Object.entries(raw)) {
    const row = toRecord(value)
    promptProfiles[useCase as AIUseCase] = {
      system_instructions: typeof row.system_instructions === 'string' ? row.system_instructions : undefined,
      prompt_instructions: typeof row.prompt_instructions === 'string' ? row.prompt_instructions : undefined,
      handbook_slugs: asStringArray(row.handbook_slugs),
    }
  }
  return promptProfiles
}

function normalizeModelProfiles(raw: Record<string, unknown>): WorkspaceAIPolicy['model_profiles'] {
  const modelProfiles: WorkspaceAIPolicy['model_profiles'] = {}
  for (const [useCase, value] of Object.entries(raw)) {
    const row = toRecord(value)
    modelProfiles[useCase as AIUseCase] = {
      provider: typeof row.provider === 'string' ? row.provider as AIProvider : undefined,
      model: typeof row.model === 'string' ? row.model : undefined,
      temperature: typeof row.temperature === 'number' ? row.temperature : undefined,
      max_tokens: typeof row.max_tokens === 'number' ? row.max_tokens : undefined,
      fallback_chain: asStringArray(row.fallback_chain),
    }
  }
  return modelProfiles
}

function normalizeToolProfiles(raw: Record<string, unknown>): WorkspaceAIPolicy['tool_profiles'] {
  const toolProfiles: WorkspaceAIPolicy['tool_profiles'] = {}
  for (const [useCase, value] of Object.entries(raw)) {
    const row = toRecord(value)
    toolProfiles[useCase as AIUseCase] = {
      tool_mode: typeof row.tool_mode === 'string' ? row.tool_mode as ToolMode : undefined,
      allowed_tools: asStringArray(row.allowed_tools),
    }
  }
  return toolProfiles
}

function normalizeAgentProfiles(raw: Record<string, unknown>): WorkspaceAIPolicy['agent_profiles'] {
  const agentProfiles: WorkspaceAIPolicy['agent_profiles'] = {}
  for (const [agentKey, value] of Object.entries(raw)) {
    const row = toRecord(value)
    agentProfiles[agentKey] = {
      provider: typeof row.provider === 'string' ? row.provider as AIProvider : undefined,
      model: typeof row.model === 'string' ? row.model : undefined,
      temperature: typeof row.temperature === 'number' ? row.temperature : undefined,
      max_tokens: typeof row.max_tokens === 'number' ? row.max_tokens : undefined,
      fallback_chain: asStringArray(row.fallback_chain),
      tool_mode: typeof row.tool_mode === 'string' ? row.tool_mode as ToolMode : undefined,
      allowed_tools: asStringArray(row.allowed_tools),
      system_prompt: typeof row.system_prompt === 'string' ? row.system_prompt : undefined,
      handbook_slugs: asStringArray(row.handbook_slugs),
    }
  }
  return agentProfiles
}

export function normalizeWorkspaceAIPolicy(rawPolicy: unknown): WorkspaceAIPolicy {
  const raw = toRecord(rawPolicy)
  const constraints = toRecord(raw.constraints)
  const approvalThresholds = toRecord(raw.approval_thresholds)
  const taskPrompts = toRecord(raw.task_prompts)
  const skillsPolicy = toRecord(raw.skills_policy)

  const normalized: WorkspaceAIPolicy = {
    ...DEFAULT_WORKSPACE_AI_POLICY,
    ...raw,
    system_instructions: typeof raw.system_instructions === 'string'
      ? raw.system_instructions
      : DEFAULT_WORKSPACE_AI_POLICY.system_instructions,
    task_prompts: {
      ...DEFAULT_WORKSPACE_AI_POLICY.task_prompts,
      task_generation: typeof taskPrompts.task_generation === 'string'
        ? taskPrompts.task_generation
        : DEFAULT_WORKSPACE_AI_POLICY.task_prompts.task_generation,
      task_analysis: typeof taskPrompts.task_analysis === 'string'
        ? taskPrompts.task_analysis
        : DEFAULT_WORKSPACE_AI_POLICY.task_prompts.task_analysis,
      prioritization: typeof taskPrompts.prioritization === 'string'
        ? taskPrompts.prioritization
        : DEFAULT_WORKSPACE_AI_POLICY.task_prompts.prioritization,
    },
    allowed_tools: raw.allowed_tools === undefined
      ? DEFAULT_WORKSPACE_AI_POLICY.allowed_tools
      : asStringArray(raw.allowed_tools),
    allowed_actions: raw.allowed_actions === undefined
      ? DEFAULT_WORKSPACE_AI_POLICY.allowed_actions
      : asStringArray(raw.allowed_actions),
    auto_apply: typeof raw.auto_apply === 'boolean' ? raw.auto_apply : DEFAULT_WORKSPACE_AI_POLICY.auto_apply,
    confidence_threshold: typeof raw.confidence_threshold === 'number'
      ? raw.confidence_threshold
      : DEFAULT_WORKSPACE_AI_POLICY.confidence_threshold,
    execution_mode: raw.execution_mode === 'semi_auto' ? 'semi_auto' : 'auto',
    approval_thresholds: {
      confidence_min_for_auto: typeof approvalThresholds.confidence_min_for_auto === 'number'
        ? approvalThresholds.confidence_min_for_auto
        : DEFAULT_WORKSPACE_AI_POLICY.approval_thresholds?.confidence_min_for_auto,
    },
    data_sources: raw.data_sources === undefined
      ? DEFAULT_WORKSPACE_AI_POLICY.data_sources
      : asStringArray(raw.data_sources),
    audit_visible: typeof raw.audit_visible === 'boolean'
      ? raw.audit_visible
      : DEFAULT_WORKSPACE_AI_POLICY.audit_visible,
    constraints: {
      ...DEFAULT_WORKSPACE_AI_POLICY.constraints,
      ...constraints,
    },
    model_profiles: normalizeModelProfiles(toRecord(raw.model_profiles)),
    tool_profiles: normalizeToolProfiles(toRecord(raw.tool_profiles)),
    prompt_profiles: normalizePromptProfiles(toRecord(raw.prompt_profiles)),
    agent_profiles: normalizeAgentProfiles(toRecord(raw.agent_profiles)),
    skills_policy: {
      allow_workspace_handbooks: typeof skillsPolicy.allow_workspace_handbooks === 'boolean'
        ? skillsPolicy.allow_workspace_handbooks
        : DEFAULT_WORKSPACE_AI_POLICY.skills_policy?.allow_workspace_handbooks,
      use_case_handbooks: Object.fromEntries(
        Object.entries(toRecord(skillsPolicy.use_case_handbooks)).map(([useCase, value]) => [
          useCase,
          asStringArray(value),
        ])
      ) as Partial<Record<AIUseCase, string[]>>,
    },
    audit_level: raw.audit_level === 'minimal' || raw.audit_level === 'full' ? raw.audit_level : 'standard',
    version: typeof raw.version === 'number' ? raw.version : DEFAULT_WORKSPACE_AI_POLICY.version,
    last_updated_by: typeof raw.last_updated_by === 'string' ? raw.last_updated_by : undefined,
    last_updated_at: typeof raw.last_updated_at === 'string' ? raw.last_updated_at : undefined,
  }

  if (!normalized.prompt_profiles?.task_action) {
    normalized.prompt_profiles = {
      ...normalized.prompt_profiles,
      task_action: {
        system_instructions: normalized.system_instructions,
        prompt_instructions: [
          normalized.task_prompts.task_generation,
          normalized.task_prompts.task_analysis,
          normalized.task_prompts.prioritization,
        ].filter(Boolean).join('\n\n'),
      },
    }
  }

  if (!normalized.tool_profiles?.task_action) {
    normalized.tool_profiles = {
      ...normalized.tool_profiles,
      task_action: {
        tool_mode: normalized.allowed_tools.length > 0 ? 'llm_tools_only' : 'none',
        allowed_tools: normalized.allowed_tools,
      },
    }
  }

  return normalized
}
