import type { SupabaseClient } from '@supabase/supabase-js'

export type AutonomySessionJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface AutonomySessionJobRow {
  id: string
  session_id: string
  user_id: string
  workspace_id: string | null
  project_id: string
  project_name: string
  project_slug: string
  status: AutonomySessionJobStatus
  command_job_id: string | null
  pipeline_run_id: string | null
  report_id: string | null
  artifact_id: string | null
  summary: Record<string, unknown>
  error: string | null
  created_at: string
  updated_at: string
}

export interface AutonomySessionJobDraft {
  sessionId: string
  userId: string
  workspaceId: string | null
  projectId: string
  projectName: string
  projectSlug: string
  commandJobId: string | null
  summary?: Record<string, unknown>
}

function countByStatus(jobs: Pick<AutonomySessionJobRow, 'status'>[]) {
  return {
    queued: jobs.filter((job) => job.status === 'queued').length,
    running: jobs.filter((job) => job.status === 'running').length,
    completed: jobs.filter((job) => job.status === 'completed').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    cancelled: jobs.filter((job) => job.status === 'cancelled').length,
  }
}

export function summarizeAutonomySessionJobs(jobs: AutonomySessionJobRow[]) {
  const counts = countByStatus(jobs)
  const completedOutputs = jobs.filter((job) => job.status === 'completed' && (job.report_id || job.artifact_id || job.pipeline_run_id))

  return {
    total_jobs: jobs.length,
    queued_jobs: counts.queued,
    running_jobs: counts.running,
    completed_jobs: counts.completed,
    failed_jobs: counts.failed,
    cancelled_jobs: counts.cancelled,
    report_count: jobs.filter((job) => !!job.report_id).length,
    artifact_count: jobs.filter((job) => !!job.artifact_id).length,
    pipeline_run_count: jobs.filter((job) => !!job.pipeline_run_id).length,
    latest_completed_project_ids: completedOutputs.slice(0, 5).map((job) => job.project_id),
  }
}

export async function createAutonomySessionJobs(
  supabase: SupabaseClient,
  drafts: AutonomySessionJobDraft[],
): Promise<AutonomySessionJobRow[]> {
  if (drafts.length === 0) return []

  const { data, error } = await supabase
    .from('autonomy_session_jobs')
    .insert(drafts.map((draft) => ({
      session_id: draft.sessionId,
      user_id: draft.userId,
      workspace_id: draft.workspaceId,
      project_id: draft.projectId,
      project_name: draft.projectName,
      project_slug: draft.projectSlug,
      status: 'queued',
      command_job_id: draft.commandJobId,
      summary: draft.summary ?? {},
    })))
    .select('*')

  if (error) throw new Error(error.message)
  return (data ?? []) as AutonomySessionJobRow[]
}

export async function listAutonomySessionJobs(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<AutonomySessionJobRow[]> {
  const { data, error } = await supabase
    .from('autonomy_session_jobs')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as AutonomySessionJobRow[]
}

export async function updateAutonomySessionJob(
  supabase: SupabaseClient,
  jobId: string,
  patch: Partial<Pick<AutonomySessionJobRow, 'status' | 'command_job_id' | 'pipeline_run_id' | 'report_id' | 'artifact_id' | 'summary' | 'error'>>,
): Promise<AutonomySessionJobRow | null> {
  const nextPatch: Record<string, unknown> = {}

  if (typeof patch.status === 'string') nextPatch.status = patch.status
  if (typeof patch.command_job_id === 'string' || patch.command_job_id === null) nextPatch.command_job_id = patch.command_job_id
  if (typeof patch.pipeline_run_id === 'string' || patch.pipeline_run_id === null) nextPatch.pipeline_run_id = patch.pipeline_run_id
  if (typeof patch.report_id === 'string' || patch.report_id === null) nextPatch.report_id = patch.report_id
  if (typeof patch.artifact_id === 'string' || patch.artifact_id === null) nextPatch.artifact_id = patch.artifact_id
  if (typeof patch.error === 'string' || patch.error === null) nextPatch.error = patch.error
  if (patch.summary && typeof patch.summary === 'object') nextPatch.summary = patch.summary

  if (Object.keys(nextPatch).length === 0) return null

  const { data, error } = await supabase
    .from('autonomy_session_jobs')
    .update(nextPatch)
    .eq('id', jobId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as AutonomySessionJobRow
}

export async function reconcileAutonomySession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{ status: string; summary: Record<string, unknown>; jobs: AutonomySessionJobRow[] }> {
  const [{ data: sessionRow, error: sessionError }, jobs] = await Promise.all([
    supabase
      .from('autonomy_sessions')
      .select('id, status, summary')
      .eq('id', sessionId)
      .single(),
    listAutonomySessionJobs(supabase, sessionId),
  ])

  if (sessionError || !sessionRow) {
    throw new Error(sessionError?.message ?? 'Autonomy session not found')
  }

  const summary = {
    ...((sessionRow.summary as Record<string, unknown> | null) ?? {}),
    ...summarizeAutonomySessionJobs(jobs),
  }

  let nextStatus = sessionRow.status
  const counts = countByStatus(jobs)
  const anyActive = counts.queued > 0 || counts.running > 0

  if (sessionRow.status === 'cancelled') {
    nextStatus = 'cancelled'
  } else if (anyActive) {
    nextStatus = 'running'
  } else if (counts.completed > 0) {
    nextStatus = 'completed'
  } else if (counts.cancelled === jobs.length && jobs.length > 0) {
    nextStatus = 'cancelled'
  } else if (jobs.length > 0) {
    nextStatus = 'failed'
  }

  const patch: Record<string, unknown> = { summary }
  if (nextStatus !== sessionRow.status) {
    patch.status = nextStatus
    if (nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled') {
      patch.window_end = new Date().toISOString()
    }
  }

  const { error: updateError } = await supabase
    .from('autonomy_sessions')
    .update(patch)
    .eq('id', sessionId)

  if (updateError) throw new Error(updateError.message)

  return { status: nextStatus, summary, jobs }
}
