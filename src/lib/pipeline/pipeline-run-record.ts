import type { SupabaseClient } from '@supabase/supabase-js'

type PipelineRunInsert = {
  user_id: string
  workspace_id: string | null
  task_description: string
  planner_model: string
  executor_model?: string
  reviewer_model?: string | null
  routing_profile_id?: string | null
  provider_chain?: string[]
  status: string
  auto_reviewed?: boolean
  handbook_ref?: string | null
  started_at?: string
  project_id?: string
}

function isMissingColumnError(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(error.message ?? '')
}

export async function insertPipelineRunRecord(
  supabase: SupabaseClient,
  payload: PipelineRunInsert,
) {
  const firstAttempt = await supabase
    .from('pipeline_runs')
    .insert(payload)
    .select('id')
    .single()

  if (!firstAttempt.error || !isMissingColumnError(firstAttempt.error)) {
    return firstAttempt
  }

  const legacyPayload = {
    user_id: payload.user_id,
    workspace_id: payload.workspace_id,
    task_description: payload.task_description,
    planner_model: payload.planner_model,
    executor_model: payload.executor_model ?? null,
    reviewer_model: payload.reviewer_model ?? null,
    status: payload.status,
    auto_reviewed: payload.auto_reviewed ?? false,
    handbook_ref: payload.handbook_ref ?? null,
  }

  return supabase
    .from('pipeline_runs')
    .insert(legacyPayload)
    .select('id')
    .single()
}
