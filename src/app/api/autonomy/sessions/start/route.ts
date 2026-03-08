import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getUserCoFounderPolicy } from '@/lib/autonomy/settings'
import { isInOvernightWindow } from '@/lib/autonomy/policy'
import { loadNightLaunchProjects, nightlySessionRequestSchema, preflightProjectRepo, type LaunchProjectOption, type RepoPreflightResult } from '@/lib/autonomy/night-session'
import { loadFounderProfile } from '@/lib/cofounder-mode/founder-profile'
import { createCommandStreamJob, setJobRunId } from '@/lib/command-surface/stream-broker'
import { runPipelineStreamJob } from '@/lib/command-surface/pipeline-runner'
import { createAutonomySessionJobs, reconcileAutonomySession, updateAutonomySessionJob, type AutonomySessionJobRow } from '@/lib/autonomy/session-jobs'

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

function buildNightAutonomyReportPrompt(project: LaunchProjectOption, objective?: string | null): string {
  const objectiveLine = objective?.trim()
    ? `Night objective: ${objective.trim()}`
    : 'Night objective: produce a safe morning handoff for this project.'

  return [
    `Prepare a durable project-health steering report for ${project.name}.`,
    objectiveLine,
    'Focus on codebase health, delivery reliability, auditability, operator trust, risks, and the best next steps by morning.',
    'Do not propose code patches or repository mutations in this report mode.',
  ].join('\n\n')
}

async function launchAutonomyProjectReport(options: {
  req: NextRequest
  supabase: any
  userId: string
  userEmail: string | null
  workspaceId: string
  sessionId: string
  sessionJob: AutonomySessionJobRow
  project: LaunchProjectOption
  objective?: string | null
  selectedAgent: Record<string, unknown>
  founderProfile: Awaited<ReturnType<typeof loadFounderProfile>>
  repoPreflight: RepoPreflightResult
}) {
  const {
    req,
    supabase,
    userId,
    userEmail,
    workspaceId,
    sessionId,
    sessionJob,
    project,
    objective,
    selectedAgent,
    founderProfile,
    repoPreflight,
  } = options

  let summary = { ...(sessionJob.summary ?? {}) }

  const persist = async (patch: Parameters<typeof updateAutonomySessionJob>[2]) => {
    if (patch.summary && typeof patch.summary === 'object') {
      summary = patch.summary as Record<string, unknown>
    }
    await updateAutonomySessionJob(supabase, sessionJob.id, patch)
    await reconcileAutonomySession(supabase, sessionId)
  }

  try {
    await persist({ status: 'running', error: null, summary: { ...summary, last_message: 'Dispatching project report pipeline' } })

    await runPipelineStreamJob({
      origin: req.nextUrl.origin,
      cookieHeader: req.headers.get('cookie'),
      supabase,
      workspaceId,
      userId,
      userEmail,
      prompt: buildNightAutonomyReportPrompt(project, objective),
      mode: 'night_autonomy',
      projectId: project.id,
      lane: null,
      taskId: null,
      requestedModel: null,
      requestedPlannerModel: null,
      requestedExecutorModel: null,
      requestedReviewerModel: null,
      requestedFallbackChain: null,
      selectedAgents: [selectedAgent],
      planningContext: {
        dispatch_kind: 'night_autonomy_project_report',
        autonomy_session_id: sessionId,
        autonomy_session_job_id: sessionJob.id,
        selected_agent_id: selectedAgent.id ?? null,
        selected_agent_name: selectedAgent.name ?? null,
        objective: objective ?? null,
        project_slug: project.slug,
        founder_profile_excerpt: founderProfile?.excerpt ?? null,
        founder_profile_available: founderProfile?.available ?? false,
        founder_profile_stale: founderProfile?.stale ?? false,
        founder_priority_order: founderProfile?.parsed?.strategicPriorityOrder ?? null,
        repo_preflight: repoPreflight,
      },
      planningGoal: `Create a morning handoff report for ${project.name} that improves safe, reviewable overnight progress and operator trust.`,
      constraints: [
        'Report-only night autonomy: do not mutate repositories.',
        'Optimize for auditability, rollback clarity, and operator comprehension.',
      ],
      limits: {
        mode: 'report_only',
        no_code_patches: true,
        no_repo_mutation: true,
      },
      reportRequest: {
        enabled: true,
        report_type: 'project_health',
        project_id: project.id,
        workspace_id: workspaceId,
        selected_agent_id: typeof selectedAgent.id === 'string' ? selectedAgent.id : null,
        selected_agent_name: typeof selectedAgent.name === 'string' ? selectedAgent.name : null,
      },
      bootstrapRunId: null,
    }, {
      onStatusUpdate: async (status, message) => {
        if (status === 'executing') {
          await persist({ status: 'running', error: null, summary: { ...summary, last_message: message ?? null } })
        }
      },
      onResolvedModels: async (resolved) => {
        await persist({
          summary: {
            ...summary,
            routing: {
              planner_model: resolved.plannerModel,
              executor_model: resolved.executorModel,
              reviewer_model: resolved.reviewerModel,
              routing_profile_id: resolved.routingProfileId,
              fallback_chain: resolved.fallbackChain,
            },
          },
        })
      },
      onRunStart: async (runId) => {
        if (sessionJob.command_job_id) {
          await setJobRunId(sessionJob.command_job_id, runId)
        }
        await persist({
          status: 'running',
          pipeline_run_id: runId,
          error: null,
          summary: { ...summary, pipeline_run_id: runId },
        })
      },
      onReportCreated: async ({ reportId, artifactId, title }) => {
        await persist({
          report_id: reportId,
          artifact_id: artifactId,
          summary: {
            ...summary,
            report_title: title,
            report_id: reportId,
            artifact_id: artifactId,
          },
        })
      },
      onPhaseError: async (message, phase) => {
        await persist({
          status: 'failed',
          error: message,
          summary: { ...summary, failed_phase: phase ?? null, last_message: message },
        })
      },
      onPipelineComplete: async () => {
        await persist({ status: 'completed', error: null, summary: { ...summary, last_message: 'Pipeline complete' } })
      },
      onDone: async (exitCode, doneSummary) => {
        if (exitCode !== 0) {
          await persist({ status: 'failed', error: doneSummary ?? 'Pipeline failed', summary: { ...summary, last_message: doneSummary ?? 'Pipeline failed' } })
        } else {
          await persist({ status: 'completed', error: null, summary: { ...summary, last_message: doneSummary ?? 'Pipeline complete' } })
        }
      },
    })
  } catch (error) {
    await persist({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Autonomy project report failed',
      summary: { ...summary, last_message: error instanceof Error ? error.message : 'Autonomy project report failed' },
    })
  }
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
          mode: 'report_only',
        },
      })
      .select('id, status, window_start, selected_agent, selected_project_ids, git_strategy, repo_preflight')
      .single()

    if (sessionError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to create autonomy session', sessionError), authResponse)
    }

    const commandJobIds = parsed.data.selected_project_ids.map(() => createCommandStreamJob(user.id))
    const createdJobs = await createAutonomySessionJobs(supabase, selectedProjects.map((project, index) => ({
      sessionId: sessionRow.id,
      userId: user.id,
      workspaceId,
      projectId: project!.id,
      projectName: project!.name,
      projectSlug: project!.slug,
      commandJobId: commandJobIds[index],
      summary: {
        objective: objective ?? null,
        report_type: 'project_health',
        selected_agent_name: parsed.data.selected_agent.name,
        founder_profile_available: founderProfile?.available ?? false,
      },
    })))

    await reconcileAutonomySession(supabase, sessionRow.id)

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
        job_count: createdJobs.length,
      },
      timestamp: now,
    })

    createdJobs.forEach((sessionJob, index) => {
      void launchAutonomyProjectReport({
        req,
        supabase,
        userId: user.id,
        userEmail: user.email ?? null,
        workspaceId: workspaceId!,
        sessionId: sessionRow.id,
        sessionJob,
        project: selectedProjects[index]!,
        objective: objective ?? null,
        selectedAgent: parsed.data.selected_agent as unknown as Record<string, unknown>,
        founderProfile,
        repoPreflight: repoPreflight[index],
      })
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
      jobCount: createdJobs.length,
      queuedJobs: createdJobs.map((job) => ({
        id: job.id,
        project_id: job.project_id,
        project_name: job.project_name,
        command_job_id: job.command_job_id,
      })),
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to start autonomy session', error), authResponse)
  }
}
