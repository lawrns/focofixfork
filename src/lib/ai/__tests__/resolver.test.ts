import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockResolveClawdRoutingProfile } = vi.hoisted(() => ({
  mockResolveClawdRoutingProfile: vi.fn(),
}))

vi.mock('@/lib/clawdbot/routing', () => ({
  resolveClawdRoutingProfile: mockResolveClawdRoutingProfile,
}))

import { normalizeWorkspaceAIPolicy } from '@/lib/ai/policy'
import { resolveAIExecutionProfile } from '@/lib/ai/resolver'

describe('AI execution profile resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveClawdRoutingProfile.mockResolvedValue({
      profile_id: 'strict-clawd',
      source: 'capabilities',
      plan_model: 'claude-opus-4-6',
      execute_model: 'kimi-k2-standard',
      review_model: 'codex-standard',
      fallback_chain: ['glm-5'],
    })
    process.env.AI_PROVIDER = 'glm'
    process.env.GLM_MODEL = 'glm-5'
  })

  it('maps legacy task prompts and allowed tools into task_action defaults', async () => {
    const policy = normalizeWorkspaceAIPolicy({
      system_instructions: 'Be concise',
      task_prompts: {
        task_generation: 'Generate tasks carefully.',
        task_analysis: 'Analyze dependencies.',
        prioritization: 'Prefer high-impact work.',
      },
      allowed_tools: ['query_tasks', 'get_task_details'],
    })

    const profile = await resolveAIExecutionProfile({
      useCase: 'task_action',
      policy,
    })

    expect(profile.system_prompt_segments.join('\n')).toContain('Be concise')
    expect(profile.system_prompt_segments.join('\n')).toContain('Generate tasks carefully.')
    expect(profile.capability_manifest.allowed_tools).toEqual(['query_tasks', 'get_task_details'])
    expect(profile.capability_manifest.tool_mode).toBe('llm_tools_only')
    expect(profile.source).toBe('env')
  })

  it('uses workspace model profile over routing and env defaults', async () => {
    const policy = normalizeWorkspaceAIPolicy({
      model_profiles: {
        pipeline_plan: {
          provider: 'openai',
          model: 'gpt-5-mini',
          temperature: 0.2,
          max_tokens: 8000,
          fallback_chain: ['gpt-4o-mini'],
        },
      },
    })

    const profile = await resolveAIExecutionProfile({
      useCase: 'pipeline_plan',
      policy,
    })

    expect(profile.provider).toBe('openai')
    expect(profile.model).toBe('gpt-5-mini')
    expect(profile.temperature).toBe(0.2)
    expect(profile.max_tokens).toBe(8000)
    expect(profile.fallback_chain).toEqual(['gpt-4o-mini'])
    expect(profile.source).toBe('workspace_policy')
  })

  it('uses custom agent overrides over workspace defaults', async () => {
    const policy = normalizeWorkspaceAIPolicy({
      model_profiles: {
        custom_agent_run: {
          provider: 'glm',
          model: 'glm-5',
        },
      },
      agent_profiles: {
        'agent-1': {
          provider: 'deepseek',
          model: 'deepseek-reasoner',
          allowed_tools: ['search_docs'],
          tool_mode: 'llm_tools_only',
          system_prompt: 'Think like a reviewer.',
        },
      },
    })

    const profile = await resolveAIExecutionProfile({
      useCase: 'custom_agent_run',
      policy,
      customAgent: {
        id: 'agent-1',
        slug: 'reviewer',
        system_prompt: 'Use strict review standards.',
        tool_access: {},
      },
    })

    expect(profile.provider).toBe('deepseek')
    expect(profile.model).toBe('deepseek-reasoner')
    expect(profile.system_prompt_segments.join('\n')).toContain('Use strict review standards.')
    expect(profile.capability_manifest.allowed_tools).toEqual(['search_docs'])
    expect(profile.source).toBe('agent_profile')
  })

  it('lets explicit requestedModel override all defaults', async () => {
    const profile = await resolveAIExecutionProfile({
      useCase: 'pipeline_review',
      requestedModel: 'manual-model-1',
    })

    expect(profile.model).toBe('manual-model-1')
    expect(profile.source).toBe('override')
    expect(profile.fallback_chain).toEqual([])
  })
})
