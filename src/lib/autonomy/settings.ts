import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCoFounderPolicy } from '@/lib/autonomy/policy'
import type { CoFounderPolicy } from '@/lib/autonomy/types'

interface SettingsRow {
  settings: Record<string, unknown> | null
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function resolveEffectiveCoFounderPolicy(
  userAiPolicy: unknown,
  workspaceAiPolicy?: unknown
): CoFounderPolicy {
  const userPolicyRecord = toRecord(userAiPolicy)
  const workspacePolicyRecord = toRecord(workspaceAiPolicy)

  const userCofounder = toRecord(userPolicyRecord.cofounder)
  const workspaceCofounder = toRecord(workspacePolicyRecord.cofounder)
  const mergedCofounder = {
    ...userCofounder,
    ...workspaceCofounder,
    overnightWindow: {
      ...toRecord(userCofounder.overnightWindow),
      ...toRecord(workspaceCofounder.overnightWindow),
    },
    hardLimits: {
      ...toRecord(userCofounder.hardLimits),
      ...toRecord(workspaceCofounder.hardLimits),
    },
    actionPolicies: {
      ...toRecord(userCofounder.actionPolicies),
      ...toRecord(workspaceCofounder.actionPolicies),
    },
    trustGates: {
      ...toRecord(userCofounder.trustGates),
      ...toRecord(workspaceCofounder.trustGates),
    },
  }

  const merged = {
    ...userPolicyRecord,
    ...workspacePolicyRecord,
    cofounder: mergedCofounder,
  }

  return resolveCoFounderPolicy(merged)
}

export async function getUserCoFounderPolicy(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string | null
): Promise<CoFounderPolicy> {
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle<SettingsRow>()

  const settings = (profileData?.settings ?? {}) as Record<string, unknown>
  const userAiPolicy = settings.aiPolicy

  if (!workspaceId) {
    return resolveEffectiveCoFounderPolicy(userAiPolicy)
  }

  const { data: membership } = await supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle<{ workspace_id: string }>()

  if (!membership) {
    return resolveEffectiveCoFounderPolicy(userAiPolicy)
  }

  const { data: workspace } = await supabase
    .from('foco_workspaces')
    .select('ai_policy')
    .eq('id', workspaceId)
    .maybeSingle<{ ai_policy: Record<string, unknown> | null }>()

  return resolveEffectiveCoFounderPolicy(userAiPolicy, workspace?.ai_policy ?? undefined)
}
