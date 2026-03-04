import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCoFounderPolicy } from '@/lib/autonomy/policy'
import type { CoFounderPolicy } from '@/lib/autonomy/types'

interface SettingsRow {
  settings: Record<string, unknown> | null
}

export async function getUserCoFounderPolicy(
  supabase: SupabaseClient,
  userId: string
): Promise<CoFounderPolicy> {
  const { data } = await supabase
    .from('user_profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle<SettingsRow>()

  const settings = (data?.settings ?? {}) as Record<string, unknown>
  const aiPolicy = settings.aiPolicy
  return resolveCoFounderPolicy(aiPolicy)
}
