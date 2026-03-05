import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_COFOUNDER_MODE_CONFIG,
  mergeCoFounderModeConfig,
  parseCoFounderModeConfig,
} from '@/lib/cofounder-mode/parse'
import {
  mapCanonicalConfigToLegacyPolicy,
  mapLegacyAIPolicyToCoFounderModePatch,
} from '@/lib/cofounder-mode/legacy-map'
import type { CoFounderModeConfigV1 } from '@/lib/cofounder-mode/types'

interface SettingsRow {
  settings: Record<string, unknown> | null
}

interface WorkspacePolicyRow {
  ai_policy: Record<string, unknown> | null
}

interface ConfigRow {
  config: Record<string, unknown> | null
  created_at: string
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function normalizeCanonicalPatch(rawAiPolicy: unknown): Partial<CoFounderModeConfigV1> {
  const aiPolicy = toRecord(rawAiPolicy)
  const direct = toRecord(aiPolicy.cofounderMode)
  const alias = toRecord(aiPolicy.cofounder_v1)

  if (Object.keys(direct).length > 0) {
    return direct as Partial<CoFounderModeConfigV1>
  }

  if (Object.keys(alias).length > 0) {
    return alias as Partial<CoFounderModeConfigV1>
  }

  return mapLegacyAIPolicyToCoFounderModePatch(aiPolicy)
}

async function getLatestConfigSnapshot(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string | null
): Promise<Partial<CoFounderModeConfigV1> | null> {
  let query = supabase
    .from('cofounder_mode_configs')
    .select('config, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    query = query.is('workspace_id', null)
  }

  const { data, error } = await query
    .eq('user_id', userId)
    .returns<ConfigRow[]>()

  if (error || !data || data.length === 0) {
    return null
  }

  return parseCoFounderModeConfig(data[0].config ?? {}).config
}

export async function verifyWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle<{ workspace_id: string }>()

  return Boolean(membership?.workspace_id)
}

export interface ResolvedCoFounderConfig {
  config: CoFounderModeConfigV1
  issues: string[]
  source: string
}

export async function resolveEffectiveCoFounderModeConfig(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string | null
): Promise<ResolvedCoFounderConfig> {
  let source = 'defaults'
  let merged = DEFAULT_COFOUNDER_MODE_CONFIG

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle<SettingsRow>()

  const userSettings = toRecord(profileData?.settings)
  const userAiPolicy = userSettings.aiPolicy
  const userPatch = normalizeCanonicalPatch(userAiPolicy)
  merged = mergeCoFounderModeConfig(merged, userPatch)
  if (Object.keys(userPatch).length > 0) {
    source = 'legacy_user_ai_policy'
  }

  const userSnapshot = await getLatestConfigSnapshot(supabase, userId, null)
  if (userSnapshot) {
    merged = mergeCoFounderModeConfig(merged, userSnapshot)
    source = 'user_config_snapshot'
  }

  if (workspaceId) {
    const isMember = await verifyWorkspaceMembership(supabase, userId, workspaceId)

    if (isMember) {
      const { data: workspace } = await supabase
        .from('foco_workspaces')
        .select('ai_policy')
        .eq('id', workspaceId)
        .maybeSingle<WorkspacePolicyRow>()

      const workspacePatch = normalizeCanonicalPatch(workspace?.ai_policy)
      merged = mergeCoFounderModeConfig(merged, workspacePatch)
      if (Object.keys(workspacePatch).length > 0) {
        source = 'legacy_workspace_ai_policy'
      }

      const workspaceSnapshot = await getLatestConfigSnapshot(supabase, userId, workspaceId)
      if (workspaceSnapshot) {
        merged = mergeCoFounderModeConfig(merged, workspaceSnapshot)
        source = 'workspace_config_snapshot'
      }
    }
  }

  const parsed = parseCoFounderModeConfig(merged)

  return {
    config: parsed.config,
    issues: parsed.issues,
    source,
  }
}

export interface PersistConfigResult {
  persisted: boolean
  id?: string
  error?: string
}

export async function persistCoFounderModeConfig(
  supabase: SupabaseClient,
  userId: string,
  config: CoFounderModeConfigV1,
  workspaceId?: string | null,
  note?: string
): Promise<PersistConfigResult> {
  const { data, error } = await supabase
    .from('cofounder_mode_configs')
    .insert({
      user_id: userId,
      workspace_id: workspaceId ?? null,
      config,
      version: config.version,
      note: note ?? null,
    })
    .select('id')
    .single<{ id: string }>()

  if (error) {
    return {
      persisted: false,
      error: error.message,
    }
  }

  return {
    persisted: true,
    id: data.id,
  }
}

export function buildLegacyPolicyFromConfig(config: CoFounderModeConfigV1) {
  return mapCanonicalConfigToLegacyPolicy(config)
}
