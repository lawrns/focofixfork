import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, databaseErrorResponse, notFoundResponse } from '@/lib/api/response-helpers'
import type { AutonomySessionJobRow } from '@/lib/autonomy/session-jobs'

export const dynamic = 'force-dynamic'

interface LedgerEventRow {
  id: string
  type: string
  payload: Record<string, unknown> | null
  timestamp: string
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

function jobOutput(job: AutonomySessionJobRow) {
  return {
    job_id: job.id,
    project_id: job.project_id,
    project_name: job.project_name,
    project_slug: job.project_slug,
    status: job.status,
    report_id: job.report_id,
    artifact_id: job.artifact_id,
    pipeline_run_id: job.pipeline_run_id,
    report_url: job.report_id ? `/reports/${job.report_id}` : null,
    pipeline_url: job.pipeline_run_id ? `/empire/pipeline?run_id=${job.pipeline_run_id}` : null,
    summary: job.summary,
    error: job.error,
    updated_at: job.updated_at,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let authResponse: NextResponse | undefined
  try {
    const { id } = await params
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { data: sessionRow, error: sessionError } = await supabase
      .from('autonomy_sessions')
      .select('id, run_id, objective, mode, profile, status, timezone, window_start, window_end, created_at, updated_at, selected_agent, selected_project_ids, git_strategy, repo_preflight, summary')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (sessionError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to read autonomy session', sessionError), authResponse)
    }
    if (!sessionRow) {
      return mergeAuthResponse(notFoundResponse('Autonomy session', id), authResponse)
    }

    const [{ data: actionLogs, error: actionLogsError }, { data: events, error: eventsError }, { data: runRow }, { data: jobs, error: jobsError }] = await Promise.all([
      supabase
        .from('autonomy_action_logs')
        .select('id, action_type, domain, input, decision, allowed, requires_approval, created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('ledger_events')
        .select('id, type, payload, timestamp')
        .eq('context_id', id)
        .order('timestamp', { ascending: false })
        .limit(50),
      sessionRow.run_id
        ? supabase
            .from('runs')
            .select('id, runner, status, summary, created_at, started_at, ended_at, updated_at')
            .eq('id', sessionRow.run_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('autonomy_session_jobs')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true }),
    ])

    if (actionLogsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch session action logs', actionLogsError), authResponse)
    }

    if (eventsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch session events', eventsError), authResponse)
    }

    if (jobsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch session jobs', jobsError), authResponse)
    }

    const typedActionLogs = ((actionLogs ?? []) as ActionLogRow[])
    const typedEvents = ((events ?? []) as LedgerEventRow[])
    const typedJobs = ((jobs ?? []) as AutonomySessionJobRow[])
    const blocked = typedActionLogs.filter((event) => event.allowed === false).length
    const approvals = typedActionLogs.filter((event) => event.requires_approval === true).length

    return mergeAuthResponse(successResponse({
      session: sessionRow,
      run: runRow ?? null,
      stats: {
        totalEvents: typedEvents.length + typedActionLogs.length,
        validations: typedActionLogs.length,
        blocked,
        requiresApproval: approvals,
        jobs: typedJobs.length,
        completedReports: typedJobs.filter((job) => !!job.report_id).length,
      },
      jobs: typedJobs,
      outputs: typedJobs.map(jobOutput),
      recentValidations: typedActionLogs,
      recentEvents: typedEvents.slice(0, 25),
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch session status', error), authResponse)
  }
}
