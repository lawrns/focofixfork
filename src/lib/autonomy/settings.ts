import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCoFounderPolicy } from '@/lib/autonomy/policy'
import type { CoFounderPolicy } from '@/lib/autonomy/types'
import {
  buildLegacyPolicyFromConfig,
  resolveEffectiveCoFounderModeConfig,
} from '@/lib/cofounder-mode/config-resolver'

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

  const merged = {
    ...userPolicyRecord,
    ...workspacePolicyRecord,
    cofounder: {
      ...toRecord(userPolicyRecord.cofounder),
      ...toRecord(workspacePolicyRecord.cofounder),
      overnightWindow: {
        ...toRecord(toRecord(userPolicyRecord.cofounder).overnightWindow),
        ...toRecord(toRecord(workspacePolicyRecord.cofounder).overnightWindow),
      },
      hardLimits: {
        ...toRecord(toRecord(userPolicyRecord.cofounder).hardLimits),
        ...toRecord(toRecord(workspacePolicyRecord.cofounder).hardLimits),
      },
      actionPolicies: {
        ...toRecord(toRecord(userPolicyRecord.cofounder).actionPolicies),
        ...toRecord(toRecord(workspacePolicyRecord.cofounder).actionPolicies),
      },
      trustGates: {
        ...toRecord(toRecord(userPolicyRecord.cofounder).trustGates),
        ...toRecord(toRecord(workspacePolicyRecord.cofounder).trustGates),
      },
    },
  }

  return resolveCoFounderPolicy(merged)
}

export async function getUserCoFounderPolicy(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string | null
): Promise<CoFounderPolicy> {
  const resolved = await resolveEffectiveCoFounderModeConfig(supabase, userId, workspaceId)
  return buildLegacyPolicyFromConfig(resolved.config)
}
