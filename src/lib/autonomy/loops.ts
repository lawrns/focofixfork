import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CofounderLoop,
  CreateLoopInput,
  ExecutionMode,
  LoopTickClaim,
} from './loop-types'
import { computeNextTick } from './loop-scheduler'
import {
  createAutonomySessionJobs,
  reconcileAutonomySession,
  updateAutonomySessionJob,
  type AutonomySessionJobRow,
} from './session-jobs'
import { runPipelineStreamJob } from '@/lib/command-surface/pipeline-runner'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function buildLoopSessionSummary(loop: CofounderLoop, iterationNumber: number): string {
  return `Co-founder loop: ${loop.loop_type} (iteration ${iterationNumber})`
}

function buildLoopReportPrompt(
  project: { name: string },
  loopType: string,
  iterationNumber: number,
  config: Record<string, unknown>,
): string {
  const objective = typeof config.objective === 'string' ? config.objective.trim() : null

  const objectiveLine = objective
    ? `Objective: ${objective}`
    : loopType === 'morning_briefing'
      ? 'Objective: produce a safe morning handoff report for this project.'
      : loopType === 'health_patrol'
        ? 'Objective: evaluate codebase health, flag risks, and propose safe improvements.'
        : loopType === 'codebase_gardening'
          ? 'Objective: surface tech debt, dead code, and maintainability issues.'
          : loopType === 'pr_babysitter'
            ? 'Objective: review open pull requests and provide actionable feedback.'
            : 'Objective: produce a steering report and surface actionable next steps.'

  return [
    `Prepare a project-health steering report for ${project.name} (loop iteration ${iterationNumber}).`,
    objectiveLine,
    'Focus on codebase health, delivery reliability, auditability, operator trust, risks, and best next steps.',
    'Do not propose code patches or repository mutations in this report mode.',
  ].join('\n\n')
}

// ---------------------------------------------------------------------------
// resolveEffectiveMode
// ---------------------------------------------------------------------------

/**
 * Determine the effective execution mode, potentially downgrading from
 * bounded_execution to report_only when the environment or policy prevents writes.
 */
export function resolveEffectiveMode(
  requestedMode: ExecutionMode,
  policy: { mode: string; hardLimits?: Record<string, unknown> },
): { effectiveMode: ExecutionMode; downgraded: boolean; reason?: string } {
  if (requestedMode === 'report_only') {
    return { effectiveMode: 'report_only', downgraded: false }
  }

  // Downgrade when the global full-auto flag is not set
  if (process.env.COFOUNDER_FULL_AUTO_ENABLED !== '1') {
    return {
      effectiveMode: 'report_only',
      downgraded: true,
      reason: 'COFOUNDER_FULL_AUTO_ENABLED is not set; downgraded to report_only',
    }
  }

  // Downgrade when policy mode is off or advisor-only
  if (policy.mode === 'off' || policy.mode === 'advisor') {
    return {
      effectiveMode: 'report_only',
      downgraded: true,
      reason: `Policy mode '${policy.mode}' does not permit writes; downgraded to report_only`,
    }
  }

  // Downgrade when hard limits explicitly block production deploys (conservative signal)
  const hardLimits = safeRecord(policy.hardLimits)
  if (hardLimits.allowProductionDeploys === false) {
    return {
      effectiveMode: 'report_only',
      downgraded: true,
      reason: 'Policy hard limit disallows production deploys; downgraded to report_only',
    }
  }

  return { effectiveMode: 'bounded_execution', downgraded: false }
}

// ---------------------------------------------------------------------------
// createLoop
// ---------------------------------------------------------------------------

/**
 * Insert a new cofounder_loops row and return the created loop.
 */
export async function createLoop(
  supabase: SupabaseClient,
  userId: string,
  input: CreateLoopInput,
  policy: { mode: string; hardLimits?: Record<string, unknown> },
): Promise<CofounderLoop> {
  const requestedMode: ExecutionMode = input.requested_execution_mode ?? 'report_only'
  const { effectiveMode } = resolveEffectiveMode(requestedMode, policy)

  const timezone = input.timezone ?? 'UTC'
  const now = new Date()
  const nextTickAt = computeNextTick(input.schedule_kind, input.schedule_value, timezone, now)

  const insertPayload = {
    user_id: userId,
    workspace_id: input.workspace_id,
    loop_type: input.loop_type,
    schedule_kind: input.schedule_kind,
    schedule_value: input.schedule_value,
    timezone,
    requested_execution_mode: requestedMode,
    effective_execution_mode: effectiveMode,
    execution_backend: input.execution_backend ?? 'clawdbot',
    execution_target: input.execution_target ?? {},
    planning_agent: input.planning_agent ?? null,
    selected_project_ids: input.selected_project_ids ?? [],
    git_strategy: input.git_strategy ?? {},
    config: input.config ?? {},
    policy_snapshot: policy as unknown as Record<string, unknown>,
    status: 'active' as const,
    expires_at: input.expires_at ?? null,
    next_tick_at: nextTickAt.toISOString(),
    last_tick_at: null,
    active_session_id: null,
    iteration_count: 0,
    summary: {},
  }

  const { data, error } = await supabase
    .from('cofounder_loops')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) throw new Error(`createLoop: ${error.message}`)
  return data as CofounderLoop
}

// ---------------------------------------------------------------------------
// claimLoopTick
// ---------------------------------------------------------------------------

/**
 * Atomically claim the next tick for a loop, preventing concurrent dispatches.
 *
 * Uses a conditional UPDATE: only succeeds when active_session_id IS NULL
 * and next_tick_at <= now and status = 'active'.
 */
export async function claimLoopTick(
  supabase: SupabaseClient,
  loopId: string,
): Promise<LoopTickClaim> {
  // First, fetch the current loop state so we can return a useful reason if skipping.
  const { data: current, error: fetchError } = await supabase
    .from('cofounder_loops')
    .select('*')
    .eq('id', loopId)
    .single()

  if (fetchError || !current) {
    throw new Error(`claimLoopTick: loop not found (${fetchError?.message ?? 'no row'})`)
  }

  const loop = current as CofounderLoop

  // Pre-check: obvious skip reasons before attempting the update
  if (loop.status !== 'active') {
    return { loop, claimed: false, skipped: true, reason: `Loop status is '${loop.status}', not active` }
  }

  if (loop.active_session_id != null) {
    return { loop, claimed: false, skipped: true, reason: 'A session is already running for this loop' }
  }

  if (loop.next_tick_at) {
    const nextTick = new Date(loop.next_tick_at)
    if (nextTick > new Date()) {
      return { loop, claimed: false, skipped: true, reason: `Next tick is in the future (${loop.next_tick_at})` }
    }
  }

  // Check expiry
  if (loop.expires_at) {
    const expiresAt = new Date(loop.expires_at)
    if (expiresAt <= new Date()) {
      // Mark expired and skip
      await supabase
        .from('cofounder_loops')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', loopId)
        .eq('status', 'active')

      const expired = { ...loop, status: 'expired' as const }
      return { loop: expired, claimed: false, skipped: true, reason: 'Loop has expired' }
    }
  }

  // Atomic claim: set next_tick_at = NULL as the distributed lock.
  // active_session_id is a UUID FK so cannot hold a non-UUID sentinel.
  // Setting next_tick_at = NULL means the tick-query (.lte) will no longer find this row.
  // dispatchLoopIteration sets active_session_id to the real session UUID.
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('cofounder_loops')
    .update({ next_tick_at: null, updated_at: now })
    .eq('id', loopId)
    .eq('status', 'active')
    .is('active_session_id', null)
    .lte('next_tick_at', now)
    .select('*')
    .single()

  if (updateError || !updated) {
    // Another process won the race
    return {
      loop,
      claimed: false,
      skipped: true,
      reason: 'Tick claim lost to concurrent process or preconditions changed',
    }
  }

  return { loop: updated as CofounderLoop, claimed: true, skipped: false }
}

// ---------------------------------------------------------------------------
// Internal: dispatch helpers
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  local_path: string | null
  git_remote: string | null
}

async function loadLoopProjects(
  supabase: SupabaseClient,
  projectIds: string[],
): Promise<ProjectRow[]> {
  if (projectIds.length === 0) return []

  const { data, error } = await supabase
    .from('foco_projects')
    .select('id, workspace_id, name, slug, description, local_path, git_remote')
    .in('id', projectIds)
    .is('archived_at', null)

  if (error) throw new Error(`loadLoopProjects: ${error.message}`)
  return (data ?? []) as ProjectRow[]
}

async function dispatchClawdbotIteration(options: {
  supabase: SupabaseClient
  loop: CofounderLoop
  userId: string
  userEmail: string | null
  workspaceId: string
  sessionId: string
  sessionJob: AutonomySessionJobRow
  project: ProjectRow
  iterationNumber: number
  origin: string
}): Promise<void> {
  const {
    supabase,
    loop,
    userId,
    userEmail,
    workspaceId,
    sessionId,
    sessionJob,
    project,
    iterationNumber,
  } = options

  let summary = { ...safeRecord(sessionJob.summary) }

  const persist = async (patch: Parameters<typeof updateAutonomySessionJob>[2]) => {
    if (patch.summary && typeof patch.summary === 'object') {
      summary = patch.summary as Record<string, unknown>
    }
    await updateAutonomySessionJob(supabase, sessionJob.id, patch)
    await reconcileAutonomySession(supabase, sessionId)
  }

  const planningAgent = safeRecord(loop.planning_agent)
  const isReportOnly = loop.effective_execution_mode === 'report_only'

  const limits: Record<string, unknown> = isReportOnly
    ? { mode: 'report_only', no_code_patches: true, no_repo_mutation: true }
    : { mode: 'bounded_execution' }

  try {
    await persist({
      status: 'running',
      error: null,
      summary: { ...summary, last_message: 'Dispatching loop iteration pipeline' },
    })

    const origin = options.origin

    await runPipelineStreamJob(
      {
        origin,
        cookieHeader: null,
        supabase,
        workspaceId,
        userId,
        userEmail,
        prompt: buildLoopReportPrompt(project, loop.loop_type, iterationNumber, loop.config),
        mode: 'loop_autonomy',
        projectId: project.id,
        lane: null,
        taskId: null,
        requestedModel: null,
        requestedPlannerModel: null,
        requestedExecutorModel: null,
        requestedReviewerModel: null,
        requestedFallbackChain: null,
        selectedAgents: planningAgent.id ? [planningAgent] : [],
        planningContext: {
          dispatch_kind: 'cofounder_loop_iteration',
          loop_id: loop.id,
          loop_type: loop.loop_type,
          autonomy_session_id: sessionId,
          autonomy_session_job_id: sessionJob.id,
          iteration_number: iterationNumber,
          selected_agent_id: planningAgent.id ?? null,
          selected_agent_name: planningAgent.name ?? null,
          project_slug: project.slug,
          execution_mode: loop.effective_execution_mode,
          git_strategy: loop.git_strategy,
        },
        planningGoal: `Co-founder loop '${loop.loop_type}' iteration ${iterationNumber} for ${project.name}.`,
        constraints: isReportOnly
          ? [
              'Report-only loop autonomy: do not mutate repositories.',
              'Optimize for auditability, rollback clarity, and operator comprehension.',
            ]
          : [
              'Bounded execution loop: propose changes only within the scope of the stated objective.',
              'Prefer reversible, reviewable operations.',
            ],
        limits,
        reportRequest: isReportOnly
          ? {
              enabled: true,
              report_type: 'project_health',
              project_id: project.id,
              workspace_id: workspaceId,
              selected_agent_id: typeof planningAgent.id === 'string' ? planningAgent.id : null,
              selected_agent_name: typeof planningAgent.name === 'string' ? planningAgent.name : null,
            }
          : null,
        bootstrapRunId: null,
      },
      {
        onStatusUpdate: async (_status, message) => {
          if (message) {
            await persist({ status: 'running', error: null, summary: { ...summary, last_message: message } })
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
          await persist({
            status: 'running',
            pipeline_run_id: runId,
            error: null,
            summary: { ...summary, pipeline_run_id: runId },
          })
        },
        onReportCreated: async ({ reportId, artifactId, title }) => {
          await persist({
            report_id: reportId ?? undefined,
            artifact_id: artifactId ?? undefined,
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
            await persist({
              status: 'failed',
              error: doneSummary ?? 'Pipeline failed',
              summary: { ...summary, last_message: doneSummary ?? 'Pipeline failed' },
            })
          } else {
            await persist({
              status: 'completed',
              error: null,
              summary: { ...summary, last_message: doneSummary ?? 'Pipeline complete' },
            })
          }
          await finalizeLoopIterationFromSession(supabase, sessionId)
        },
      },
    )
  } catch (err) {
    await persist({
      status: 'failed',
      error: err instanceof Error ? err.message : 'Loop iteration dispatch failed',
      summary: {
        ...summary,
        last_message: err instanceof Error ? err.message : 'Loop iteration dispatch failed',
      },
    })
    await finalizeLoopIterationFromSession(supabase, sessionId)
  }
}

async function dispatchOpenclawIteration(options: {
  supabase: SupabaseClient
  loop: CofounderLoop
  userId: string
  userEmail: string | null
  workspaceId: string
  sessionId: string
  sessionJob: AutonomySessionJobRow
  project: ProjectRow
  iterationNumber: number
  origin: string
}): Promise<void> {
  const {
    supabase,
    loop,
    sessionId,
    sessionJob,
    project,
    iterationNumber,
    origin,
  } = options

  let summary = { ...safeRecord(sessionJob.summary) }

  const persist = async (patch: Parameters<typeof updateAutonomySessionJob>[2]) => {
    if (patch.summary && typeof patch.summary === 'object') {
      summary = patch.summary as Record<string, unknown>
    }
    await updateAutonomySessionJob(supabase, sessionJob.id, patch)
    await reconcileAutonomySession(supabase, sessionId)
  }

  try {
    await persist({
      status: 'running',
      error: null,
      summary: { ...summary, last_message: 'Dispatching to OpenClaw gateway' },
    })

    const planningAgent = safeRecord(loop.planning_agent)

    // Context envelope for openclaw — includes loop/session correlation IDs
    const contextEnvelope: Record<string, unknown> = {
      loop_id: loop.id,
      loop_type: loop.loop_type,
      session_id: sessionId,
      job_id: sessionJob.id,
      iteration_number: iterationNumber,
      workspace_id: loop.workspace_id,
      project_id: project.id,
      project_name: project.name,
      project_slug: project.slug,
      execution_mode: loop.effective_execution_mode,
      git_strategy: loop.git_strategy,
      config: loop.config,
    }

    const taskPayload = {
      agentId: typeof planningAgent.id === 'string' ? planningAgent.id : 'cofounder',
      task: buildLoopReportPrompt(project, loop.loop_type, iterationNumber, loop.config),
      context: contextEnvelope,
    }

    const res = await fetch(`${origin}/api/openclaw-gateway/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskPayload),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`OpenClaw gateway returned HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    const responseData = await res.json() as { runId?: string; correlationId?: string; status?: string }
    const externalRunId = responseData.runId ?? responseData.correlationId ?? null
    const correlationId = responseData.correlationId ?? null

    await persist({
      status: 'running',
      pipeline_run_id: externalRunId ?? undefined,
      error: null,
      summary: {
        ...summary,
        external_run_id: externalRunId,
        correlation_id: correlationId,
        gateway_status: responseData.status ?? 'accepted',
        last_message: 'Task accepted by OpenClaw gateway',
      },
    })

    // For openclaw, completion is signalled via callback — mark as running for now
    // finalizeLoopIterationFromSession will clean up when the session reaches terminal state
  } catch (err) {
    await persist({
      status: 'failed',
      error: err instanceof Error ? err.message : 'OpenClaw dispatch failed',
      summary: {
        ...summary,
        last_message: err instanceof Error ? err.message : 'OpenClaw dispatch failed',
      },
    })
  }
}

// ---------------------------------------------------------------------------
// dispatchLoopIteration
// ---------------------------------------------------------------------------

/**
 * After a tick has been claimed, create the autonomy_session, per-project jobs,
 * and fire off the appropriate backend dispatcher.
 *
 * The caller is responsible for calling claimLoopTick first and passing the
 * claimed loop. This function updates active_session_id on the loop row.
 */
export async function dispatchLoopIteration(options: {
  supabase: SupabaseClient
  loop: CofounderLoop
  userId: string
  userEmail: string | null
  workspaceId: string
  origin?: string
}): Promise<{ sessionId: string; runId: string; jobIds: string[] }> {
  const { supabase, loop, userId, userEmail, workspaceId } = options
  const origin = options.origin ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const iterationNumber = loop.iteration_count + 1

  // Load projects
  const projects = await loadLoopProjects(supabase, loop.selected_project_ids)

  // Create run row
  const now = new Date().toISOString()
  const { data: runRow, error: runError } = await supabase
    .from('runs')
    .insert({
      runner: safeRecord(loop.planning_agent).id ?? 'cofounder_loop',
      status: 'running',
      summary: buildLoopSessionSummary(loop, iterationNumber),
      workspace_id: workspaceId,
      started_at: now,
    })
    .select('id, runner, status, summary, started_at, created_at')
    .single()

  if (runError) throw new Error(`dispatchLoopIteration: failed to create run — ${runError.message}`)

  // Create autonomy_session row
  const { data: sessionRow, error: sessionError } = await supabase
    .from('autonomy_sessions')
    .insert({
      user_id: userId,
      run_id: runRow.id,
      workspace_id: workspaceId,
      loop_id: loop.id,
      iteration_number: iterationNumber,
      objective: typeof loop.config.objective === 'string' ? loop.config.objective : null,
      mode: (loop.policy_snapshot as Record<string, unknown>).mode ?? 'bounded',
      profile: (loop.policy_snapshot as Record<string, unknown>).profile ?? 'bounded_operator',
      status: 'running',
      timezone: loop.timezone,
      window_start: now,
      config_snapshot: {
        loop_id: loop.id,
        loop_type: loop.loop_type,
        iteration_number: iterationNumber,
        execution_mode: loop.effective_execution_mode,
        execution_backend: loop.execution_backend,
        policy_snapshot: loop.policy_snapshot,
        git_strategy: loop.git_strategy,
        config: loop.config,
      } as unknown as Record<string, unknown>,
      selected_agent: (loop.planning_agent ?? {}) as unknown as Record<string, unknown>,
      selected_project_ids: loop.selected_project_ids,
      git_strategy: loop.git_strategy as unknown as Record<string, unknown>,
      summary: {
        project_count: projects.length,
        loop_id: loop.id,
        loop_type: loop.loop_type,
        iteration_number: iterationNumber,
        mode: loop.effective_execution_mode,
      },
    })
    .select('id, status, window_start')
    .single()

  if (sessionError) throw new Error(`dispatchLoopIteration: failed to create session — ${sessionError.message}`)

  // Create per-project session jobs
  const createdJobs = await createAutonomySessionJobs(
    supabase,
    projects.map((project) => ({
      sessionId: sessionRow.id,
      userId,
      workspaceId,
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      commandJobId: null,
      summary: {
        loop_id: loop.id,
        loop_type: loop.loop_type,
        iteration_number: iterationNumber,
        execution_mode: loop.effective_execution_mode,
      },
    })),
  )

  await reconcileAutonomySession(supabase, sessionRow.id)

  // Wire active_session_id on the loop (replacing the '__claiming__' sentinel)
  await supabase
    .from('cofounder_loops')
    .update({ active_session_id: sessionRow.id, updated_at: new Date().toISOString() })
    .eq('id', loop.id)

  // Ledger event
  await supabase.from('ledger_events').insert({
    type: 'cofounder_loop_iteration_started',
    source: 'cofounder_loop',
    context_id: sessionRow.id,
    payload: {
      loop_id: loop.id,
      loop_type: loop.loop_type,
      session_id: sessionRow.id,
      run_id: runRow.id,
      iteration_number: iterationNumber,
      execution_backend: loop.execution_backend,
      execution_mode: loop.effective_execution_mode,
      selected_project_ids: loop.selected_project_ids,
      job_count: createdJobs.length,
    },
    timestamp: now,
  })

  // Fire dispatchers per project — do not await (fire-and-forget, same pattern as start route)
  createdJobs.forEach((sessionJob, index) => {
    const project = projects[index]
    if (!project) return

    if (loop.execution_backend === 'openclaw') {
      void dispatchOpenclawIteration({
        supabase,
        loop,
        userId,
        userEmail,
        workspaceId,
        sessionId: sessionRow.id,
        sessionJob,
        project,
        iterationNumber,
        origin,
      })
    } else {
      // clawdbot (default)
      void dispatchClawdbotIteration({
        supabase,
        loop,
        userId,
        userEmail,
        workspaceId,
        sessionId: sessionRow.id,
        sessionJob,
        project,
        iterationNumber,
        origin,
      })
    }
  })

  return {
    sessionId: sessionRow.id,
    runId: runRow.id,
    jobIds: createdJobs.map((job) => job.id),
  }
}

// ---------------------------------------------------------------------------
// Lifecycle control: pause / resume / cancel
// ---------------------------------------------------------------------------

export async function pauseLoop(
  supabase: SupabaseClient,
  loopId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('cofounder_loops')
    .update({
      status: 'paused',
      next_tick_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loopId)
    .eq('user_id', userId)
    .in('status', ['active'])

  if (error) throw new Error(`pauseLoop: ${error.message}`)
}

export async function resumeLoop(
  supabase: SupabaseClient,
  loopId: string,
  userId: string,
): Promise<void> {
  // Fetch the loop to compute next tick
  const { data, error: fetchError } = await supabase
    .from('cofounder_loops')
    .select('schedule_kind, schedule_value, timezone')
    .eq('id', loopId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !data) {
    throw new Error(`resumeLoop: loop not found (${fetchError?.message ?? 'no row'})`)
  }

  const loop = data as Pick<CofounderLoop, 'schedule_kind' | 'schedule_value' | 'timezone'>
  const nextTickAt = computeNextTick(loop.schedule_kind, loop.schedule_value, loop.timezone, new Date())

  const { error } = await supabase
    .from('cofounder_loops')
    .update({
      status: 'active',
      next_tick_at: nextTickAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', loopId)
    .eq('user_id', userId)
    .eq('status', 'paused')

  if (error) throw new Error(`resumeLoop: ${error.message}`)
}

export async function cancelLoop(
  supabase: SupabaseClient,
  loopId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('cofounder_loops')
    .update({
      status: 'cancelled',
      next_tick_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loopId)
    .eq('user_id', userId)
    .not('status', 'eq', 'cancelled')

  if (error) throw new Error(`cancelLoop: ${error.message}`)
}

// ---------------------------------------------------------------------------
// finalizeLoopIterationFromSession
// ---------------------------------------------------------------------------

/**
 * Called when an autonomy_session linked to a loop reaches a terminal state
 * (completed / failed / cancelled).
 *
 * - Clears active_session_id
 * - Increments iteration_count
 * - Updates last_tick_at to now
 * - Computes and stores the next next_tick_at
 * - If expires_at is in the past, sets status='expired'
 * - If loop is cancelled/paused, leaves status unchanged
 */
export async function finalizeLoopIterationFromSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  // Find the loop linked to this session
  const { data: loopRow, error: fetchError } = await supabase
    .from('cofounder_loops')
    .select('*')
    .eq('active_session_id', sessionId)
    .single()

  if (fetchError || !loopRow) {
    // Session may not be loop-linked or already finalized — not an error
    return
  }

  const loop = loopRow as CofounderLoop
  const now = new Date()

  // Do not re-finalize if loop is already terminal
  if (loop.status === 'cancelled' || loop.status === 'expired' || loop.status === 'completed') {
    // Still clear the active_session_id to unblock any stuck state
    await supabase
      .from('cofounder_loops')
      .update({ active_session_id: null, updated_at: now.toISOString() })
      .eq('id', loop.id)
    return
  }

  // Check expiry
  const isExpired = loop.expires_at ? new Date(loop.expires_at) <= now : false

  let nextStatus: CofounderLoop['status'] = loop.status === 'paused' ? 'paused' : 'active'
  if (isExpired) nextStatus = 'expired'

  // Compute next tick only when loop is staying active
  let nextTickAt: string | null = null
  if (nextStatus === 'active') {
    nextTickAt = computeNextTick(
      loop.schedule_kind,
      loop.schedule_value,
      loop.timezone,
      now,
    ).toISOString()
  }

  const patch: Record<string, unknown> = {
    active_session_id: null,
    iteration_count: loop.iteration_count + 1,
    last_tick_at: now.toISOString(),
    status: nextStatus,
    updated_at: now.toISOString(),
  }

  if (nextStatus === 'active') {
    patch.next_tick_at = nextTickAt
  } else if (nextStatus === 'expired' || nextStatus === 'paused') {
    patch.next_tick_at = null
  }

  const { error: updateError } = await supabase
    .from('cofounder_loops')
    .update(patch)
    .eq('id', loop.id)

  if (updateError) throw new Error(`finalizeLoopIterationFromSession: ${updateError.message}`)
}
