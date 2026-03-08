import type { WorkspaceAIPolicy } from '@/lib/ai/policy'
import { DEFAULT_WORKSPACE_AI_POLICY } from '@/lib/ai/policy'

export type CustomAgentSummary = {
  id: string
  name: string
  slug: string
  lane: string
  description: string | null
  active: boolean
}

export function cloneDefaultPolicy(): WorkspaceAIPolicy {
  return JSON.parse(JSON.stringify(DEFAULT_WORKSPACE_AI_POLICY)) as WorkspaceAIPolicy
}

export function mergePolicy(input: Partial<WorkspaceAIPolicy> | null | undefined): WorkspaceAIPolicy {
  const base = cloneDefaultPolicy()
  const policy = input ?? {}

  return {
    ...base,
    ...policy,
    task_prompts: {
      ...base.task_prompts,
      ...(policy.task_prompts ?? {}),
    },
    constraints: {
      ...base.constraints,
      ...(policy.constraints ?? {}),
    },
    approval_thresholds: {
      ...base.approval_thresholds,
      ...(policy.approval_thresholds ?? {}),
    },
    model_profiles: {
      ...base.model_profiles,
      ...(policy.model_profiles ?? {}),
    },
    tool_profiles: {
      ...base.tool_profiles,
      ...(policy.tool_profiles ?? {}),
    },
    prompt_profiles: {
      ...base.prompt_profiles,
      ...(policy.prompt_profiles ?? {}),
    },
    agent_profiles: {
      ...base.agent_profiles,
      ...(policy.agent_profiles ?? {}),
    },
    skills_policy: {
      ...base.skills_policy,
      ...(policy.skills_policy ?? {}),
      use_case_handbooks: {
        ...(base.skills_policy?.use_case_handbooks ?? {}),
        ...(policy.skills_policy?.use_case_handbooks ?? {}),
      },
    },
  }
}

export function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function formatList(value?: string[]): string {
  return value?.join(', ') ?? ''
}
