import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getUserCoFounderPolicy } from '@/lib/autonomy/settings'
import { isInOvernightWindow } from '@/lib/autonomy/policy'
import { loadNightLaunchProjects, nightlySessionRequestSchema, preflightProjectRepo } from '@/lib/autonomy/night-session'
import { loadFounderProfile } from '@/lib/cofounder-mode/founder-profile'

export const dynamic = 'force-dynamic'

function buildSessionSummary(objective?: string): string {
  if (!objective || objective.trim().length === 0) {
    return 'Autonomous co-founder session'
  }
  return `Autonomous co-founder session: ${objective.trim().slice(0, 180)}`
}

function parseWorkspaceId(body: Record<string, unknown>): string | null {
  return typeof body.workspace_id === 'string' && body.workspace_id.length > 0
    ? body.workspace_id
    : null
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const parsed = nightlySessionRequestSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid night autonomy payload', parsed.error.flatten()), authResponse)
    }

    const objective = parsed.data.objective ?? undefined
    const workspaceId = parseWorkspaceId(parsed.data)

    const policy = await getUserCoFounderPolicy(supabase, user.id, workspaceId)
    if (policy.mode === 'off') {
      return mergeAuthResponse(validationFailedResponse('Co-founder autonomy is disabled in settings'), authResponse)
    }

    if (!isInOvernightWindow(policy)) {
      return mergeAuthResponse(validationFailedResponse('Current time is outside the configured overnight window'), authResponse)
    }

    const [eligibleProjects, founderProfile] = await Promise.all([
      loadNightLaunchProjects(supabase, user.id, workspaceId!),
      loadFounderProfile(),
    ])
    const projectMap = new Map(eligibleProjects.map((project) => [project.id, project]))
    const selectedProjects = parsed.data.selected_project_ids.map((projectId) => projectMap.get(projectId) ?? null)
    if (selectedProjects.some((project) => project == null)) {
      return mergeAuthResponse(validationFailedResponse('One or more selected projects are missing or not repo-backed'), authResponse)
    }

    const repoPreflight = await Promise.all(
      selectedProjects.map((project) => preflightProjectRepo(project!, parsed.data.selected_agent, parsed.data.git_strategy))
    )

    const failingRepo = repoPreflight.find((result) => !result.ok)
    if (failingRepo) {
      return mergeAuthResponse(
        validationFailedResponse('Night autonomy preflight failed', {
          projectId: failingRepo.projectId,
          projectName: failingRepo.projectName,
          reason: failingRepo.reason,
          repo_preflight: repoPreflight,
        }),
        authResponse,
      )
    }

    const now = new Date().toISOString()
    const { data: runRow, error: runError } = await supabase
      .from('runs')
      .insert({
        runner: parsed.data.selected_agent.id,
        status: 'running',
        summary: buildSessionSummary(objective),
        workspace_id: workspaceId,
        started_at: now,
      })
      .select('id, runner, status, summary, started_at, created_at')
      .single()

    if (runError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to start autonomy session', runError), authResponse)
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from('autonomy_sessions')
      .insert({
        user_id: user.id,
        run_id: runRow.id,
        workspace_id: workspaceId,
        objective: objective ?? null,
        mode: policy.mode,
        profile: policy.profile,
        status: 'running',
        timezone: policy.overnightWindow.timezone,
        window_start: now,
        config_snapshot: {
          policy,
          objective: objective ?? null,
          founder_profile_excerpt: founderProfile?.excerpt ?? null,
          founder_strategy: founderProfile?.parsed ?? null,
          founder_profile_issues: founderProfile?.issues ?? [],
        } as unknown as Record<string, unknown>,
        selected_agent: parsed.data.selected_agent as unknown as Record<string, unknown>,
        selected_project_ids: parsed.data.selected_project_ids,
        repo_preflight: repoPreflight as unknown as Record<string, unknown>,
        git_strategy: parsed.data.git_strategy as unknown as Record<string, unknown>,
        summary: {
          project_count: parsed.data.selected_project_ids.length,
          preflight_ok: true,
          founder_profile_available: founderProfile?.available ?? false,
          founder_profile_stale: founderProfile?.stale ?? false,
        },
      })
      .select('id, status, window_start, selected_agent, selected_project_ids, git_strategy, repo_preflight')
      .single()

    if (sessionError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to create autonomy session', sessionError), authResponse)
    }

    await supabase.from('ledger_events').insert({
      type: 'autonomy_session_started',
      source: 'cofounder',
      context_id: sessionRow.id,
      payload: {
        session_id: sessionRow.id,
        run_id: runRow.id,
        objective: objective ?? null,
        selected_agent: parsed.data.selected_agent,
        selected_project_ids: parsed.data.selected_project_ids,
        repo_preflight: repoPreflight,
        git_strategy: parsed.data.git_strategy,
        mode: policy.mode,
        profile: policy.profile,
        hardLimits: policy.hardLimits,
        overnightWindow: policy.overnightWindow,
        founder_profile_excerpt: founderProfile?.excerpt ?? null,
        founder_strategy: founderProfile?.parsed ?? null,
        founder_profile_issues: founderProfile?.issues ?? [],
      },
      timestamp: now,
    })

    return mergeAuthResponse(successResponse({
      sessionId: sessionRow.id,
      runId: runRow.id,
      status: sessionRow.status,
      startedAt: sessionRow.window_start,
      objective: objective ?? null,
      selectedAgent: parsed.data.selected_agent,
      selectedProjectIds: parsed.data.selected_project_ids,
      repoPreflight: repoPreflight,
      gitStrategy: parsed.data.git_strategy,
      founderProfile: founderProfile,
      policy,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to start autonomy session', error), authResponse)
  }
}
