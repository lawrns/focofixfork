import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import type { AutonomySessionJobRow } from '@/lib/autonomy/session-jobs'

export const dynamic = 'force-dynamic'

interface SessionRow {
  id: string
  run_id: string | null
  objective: string | null
  mode: string
  profile: string
  status: string
  window_start: string
  window_end: string | null
  created_at: string
  selected_agent?: Record<string, unknown> | null
  selected_project_ids?: string[] | null
  git_strategy?: Record<string, unknown> | null
  repo_preflight?: Record<string, unknown>[] | null
  summary?: Record<string, unknown> | null
}

interface DecisionRow {
  id: string
  intent: string
  authority_level: string
  created_at: string
}

interface ActionLogRow {
  id: string
  action_type: string
  domain: string
  input: Record<string, unknown> | null
  decision: Record<string, unknown> | null
  allowed: boolean
  requires_approval: boolean
  created_at: string
}

function buildOutput(job: AutonomySessionJobRow) {
  return {
    job_id: job.id,
    session_id: job.session_id,
    project_id: job.project_id,
    project_name: job.project_name,
    project_slug: job.project_slug,
    status: job.status,
    report_id: job.report_id,
    artifact_id: job.artifact_id,
    pipeline_run_id: job.pipeline_run_id,
    report_title: typeof job.summary?.report_title === 'string' ? job.summary.report_title : null,
    report_url: job.report_id ? `/reports/${job.report_id}` : null,
    pipeline_url: job.pipeline_run_id ? `/empire/pipeline?run_id=${job.pipeline_run_id}` : null,
    error: job.error,
    updated_at: job.updated_at,
  }
}

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { searchParams } = new URL(req.url)
    const sinceHours = Math.max(1, Math.min(72, parseInt(searchParams.get('sinceHours') ?? '12', 10)))
    const sinceDate = new Date(Date.now() - (sinceHours * 60 * 60 * 1000)).toISOString()

    const { data: sessions, error: sessionsError } = await supabase
      .from('autonomy_sessions')
      .select('id, run_id, objective, mode, profile, status, window_start, window_end, created_at, selected_agent, selected_project_ids, git_strategy, repo_preflight, summary')
      .eq('user_id', user.id)
      .gte('window_start', sinceDate)
      .order('window_start', { ascending: false })

    if (sessionsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy sessions', sessionsError), authResponse)
    }

    const sessionIds = ((sessions ?? []) as SessionRow[]).map((session) => session.id)

    const [{ data: decisions, error: decisionsError }, { data: actionLogs, error: actionLogsError }, jobsResult] = await Promise.all([
      supabase
        .from('crico_actions')
        .select('id, intent, authority_level, created_at')
        .eq('requires_approval', true)
        .eq('status', 'pending')
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('autonomy_action_logs')
        .select('id, action_type, domain, input, decision, allowed, requires_approval, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: false }),
      sessionIds.length > 0
        ? supabase
            .from('autonomy_session_jobs')
            .select('*')
            .in('session_id', sessionIds)
            .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    if (decisionsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch pending decisions', decisionsError), authResponse)
    }

    if (actionLogsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy action logs', actionLogsError), authResponse)
    }

    if (jobsResult.error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy session jobs', jobsResult.error), authResponse)
    }

    const typedActionLogs = (actionLogs ?? []) as ActionLogRow[]
    const typedJobs = (jobsResult.data ?? []) as AutonomySessionJobRow[]
    const executedActions = typedActionLogs.filter((event) => event.allowed === true).length
    const blockedActions = typedActionLogs.filter((event) => event.allowed === false).length
    const latestOutputs = typedJobs
      .filter((job) => job.report_id || job.artifact_id || job.pipeline_run_id || job.error)
      .slice(0, 20)
      .map(buildOutput)

    return mergeAuthResponse(successResponse({
      generatedAt: new Date().toISOString(),
      windowHours: sinceHours,
      summary: {
        sessions: (sessions ?? []).length,
        executedActions,
        blockedActions,
        pendingDecisions: (decisions ?? []).length,
        reposTouched: (sessions ?? []).reduce((count, session: SessionRow) => count + (session.selected_project_ids?.length ?? 0), 0),
        reportJobs: typedJobs.length,
        completedReports: typedJobs.filter((job) => !!job.report_id).length,
        failedReports: typedJobs.filter((job) => job.status === 'failed').length,
      },
      jobs_summary: {
        queued: typedJobs.filter((job) => job.status === 'queued').length,
        running: typedJobs.filter((job) => job.status === 'running').length,
        completed: typedJobs.filter((job) => job.status === 'completed').length,
        failed: typedJobs.filter((job) => job.status === 'failed').length,
        cancelled: typedJobs.filter((job) => job.status === 'cancelled').length,
      },
      sessions: (sessions ?? []) as SessionRow[],
      latest_outputs: latestOutputs,
      decisions: (decisions ?? []) as DecisionRow[],
      validations: typedActionLogs.slice(0, 50),
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to generate morning report', error), authResponse)
  }
}
