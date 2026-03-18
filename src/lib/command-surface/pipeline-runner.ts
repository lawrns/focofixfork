import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { isLane } from '@/lib/agent-ops/lane-policy'
import { mergeRunTrace } from '@/lib/runs/trace'

export const COMMAND_PIPELINE_RUNTIME = 'nodejs'
export const COMMAND_PIPELINE_DYNAMIC = 'force-dynamic'
export const COMMAND_PIPELINE_MAX_DURATION = 300

function safeString(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function readUpstreamError(res: Response): Promise<string | null> {
  try {
    const text = await res.text()
    if (!text) return null

    try {
      const json = JSON.parse(text) as Record<string, unknown>
      const message =
        (typeof json.error === 'string' && json.error) ||
        (typeof json.message === 'string' && json.message) ||
        (typeof json.detail === 'string' && json.detail) ||
        null
      return message ?? text.slice(0, 300)
    } catch {
      return text.slice(0, 300)
    }
  } catch {
    return null
  }
}

export interface PipelineRunnerArgs {
  origin: string
  cookieHeader: string | null
  supabase: SupabaseClient
  workspaceId: string | null
  userId: string
  userEmail: string | null
  prompt: string
  mode: string
  projectId: string | null
  lane: string | null
  taskId: string | null
  requestedModel: string | null
  requestedPlannerModel: string | null
  requestedExecutorModel: string | null
  requestedReviewerModel: string | null
  requestedFallbackChain: string[] | null
  selectedAgents: unknown
  planningContext: unknown
  planningGoal: string | null
  constraints: unknown
  limits: unknown
  reportRequest: Record<string, unknown> | null
  bootstrapRunId: string | null
}

export interface PipelineRunnerResolvedModels {
  plannerModel: string
  executorModel: string
  reviewerModel: string
  routingProfileId: string | null
  plannerProvider: string | null
  executorProvider: string | null
  reviewerProvider: string | null
  fallbackChain: string[]
  lane: string | null
}

export interface PipelineRunnerCallbacks {
  onStatusUpdate?: (status: 'queued' | 'executing' | 'completed' | 'error', message?: string, phase?: string) => void
  onReasoning?: (text: string, phase?: string) => void
  onOutput?: (text: string, phase?: string) => void
  onRunStart?: (runId: string) => void | Promise<void>
  onResolvedModels?: (resolved: PipelineRunnerResolvedModels) => void | Promise<void>
  onPhaseStart?: (phase?: string) => void | Promise<void>
  onPhaseComplete?: (phase?: string) => void | Promise<void>
  onReportCreated?: (event: { reportId: string | null; artifactId: string | null; title: string }) => void | Promise<void>
  onPhaseError?: (message: string, phase?: string) => void | Promise<void>
  onPipelineComplete?: () => void | Promise<void>
  onDone?: (exitCode: number, summary?: string) => void | Promise<void>
}

export async function runPipelineStreamJob(args: PipelineRunnerArgs, callbacks: PipelineRunnerCallbacks = {}): Promise<void> {
  let doneSent = false

  const finish = async (exitCode: number, summary?: string) => {
    if (doneSent) return
    doneSent = true
    await callbacks.onStatusUpdate?.(exitCode === 0 ? 'completed' : 'error', summary)
    await callbacks.onDone?.(exitCode, summary)
  }

  const fail = async (message: string, phase?: string) => {
    await callbacks.onPhaseError?.(message, phase)
    await finish(1, message)
  }

  await callbacks.onStatusUpdate?.('executing', 'Dispatching command pipeline')

  try {
    const cookieWorkspaceMatch = args.cookieHeader?.match(/workspace_id=([^;]+)/)
    const resolvedWorkspaceId = args.workspaceId ?? (cookieWorkspaceMatch?.[1] ? decodeURIComponent(cookieWorkspaceMatch[1]) : null)

    const [{ profile: planProfile }, { profile: executeProfile }, { profile: reviewProfile }] = await Promise.all([
      resolveAIExecutionProfileFromWorkspace({
        supabase: args.supabase,
        userId: args.userId,
        workspaceId: resolvedWorkspaceId,
        useCase: 'command_surface_plan',
        requestedModel: args.requestedPlannerModel ?? args.requestedModel,
        requestedFallbackChain: args.requestedFallbackChain,
      }),
      resolveAIExecutionProfileFromWorkspace({
        supabase: args.supabase,
        userId: args.userId,
        workspaceId: resolvedWorkspaceId,
        useCase: 'command_surface_execute',
        requestedModel: args.requestedExecutorModel ?? args.requestedModel,
        requestedFallbackChain: args.requestedFallbackChain,
      }),
      resolveAIExecutionProfileFromWorkspace({
        supabase: args.supabase,
        userId: args.userId,
        workspaceId: resolvedWorkspaceId,
        useCase: 'command_surface_review',
        requestedModel: args.requestedReviewerModel ?? args.requestedModel,
        requestedFallbackChain: args.requestedFallbackChain,
      }),
    ])

    const plannerModel = planProfile.model
    const executorModel = executeProfile.model
    const reviewerModel = reviewProfile.model
    const normalizedLane = isLane(args.lane) ? args.lane : null

    await callbacks.onResolvedModels?.({
      plannerModel,
      executorModel,
      reviewerModel,
      routingProfileId: planProfile.routing_profile_id ?? null,
      plannerProvider: planProfile.provider ?? null,
      executorProvider: executeProfile.provider ?? null,
      reviewerProvider: reviewProfile.provider ?? null,
      fallbackChain: executeProfile.fallback_chain,
      lane: normalizedLane,
    })

    if (args.bootstrapRunId) {
      await mergeRunTrace(args.supabase, args.bootstrapRunId, {
        ai_routing: {
          requested: {
            model: args.requestedModel,
            planner_model: args.requestedPlannerModel,
            executor_model: args.requestedExecutorModel,
            reviewer_model: args.requestedReviewerModel,
            fallback_chain: args.requestedFallbackChain ?? [],
          },
          actual: {
            planner_model: plannerModel,
            executor_model: executorModel,
            reviewer_model: reviewerModel,
            planner_provider: planProfile.provider,
            executor_provider: executeProfile.provider,
            reviewer_provider: reviewProfile.provider,
            fallback_chain: executeProfile.fallback_chain,
          },
        },
        command_surface: {
          workspace_id: resolvedWorkspaceId,
          project_id: args.projectId,
          lane: normalizedLane,
        },
      })
    }

    const pipelineRes = await fetch(`${args.origin}/api/pipeline/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(args.cookieHeader ? { cookie: args.cookieHeader } : {}),
      },
      body: JSON.stringify({
        task_description:
          `Command Surface request\n` +
          `Mode: ${args.mode}\n` +
          `User: ${args.userEmail ?? args.userId}\n\n` +
          `${args.prompt.trim()}`,
        routing_profile_id: planProfile.routing_profile_id,
        planner_model: plannerModel,
        executor_model: executorModel,
        reviewer_model: reviewerModel,
        auto_review: true,
        handbook_slug: 'general',
        project_id: args.projectId,
        task_id: args.taskId,
        lane: normalizedLane,
        selected_agents: args.selectedAgents,
        context: args.planningContext,
        planning_goal: args.planningGoal,
        constraints: args.constraints,
        limits: args.limits,
        report_request: args.reportRequest,
      }),
      signal: AbortSignal.timeout(300_000),
    })

    if (!pipelineRes.ok || !pipelineRes.body) {
      const upstreamDetail = await readUpstreamError(pipelineRes)
      const detail = upstreamDetail ? `: ${upstreamDetail}` : ''
      await fail(`Agent service returned HTTP ${pipelineRes.status}${detail}`)
      return
    }

    const reader = pipelineRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        try {
          const event = JSON.parse(line.slice(6)) as Record<string, unknown>
          const type = typeof event.type === 'string' ? event.type : ''
          const phase = typeof event.phase === 'string' ? event.phase : undefined

          if (type === 'text_delta' && typeof event.text === 'string') {
            await callbacks.onOutput?.(event.text, phase)
            continue
          }

          if (type === 'activity' && typeof event.message === 'string') {
            await callbacks.onReasoning?.(event.message, phase)
            continue
          }

          if (type === 'run_start' && typeof event.run_id === 'string') {
            await callbacks.onRunStart?.(event.run_id)
            continue
          }

          if (type === 'phase_start') {
            await callbacks.onStatusUpdate?.('executing', `Phase started: ${phase ?? 'unknown'}`, phase)
            await callbacks.onPhaseStart?.(phase)
            continue
          }

          if (type === 'phase_complete') {
            await callbacks.onStatusUpdate?.('executing', `Phase complete: ${phase ?? 'unknown'}`, phase)
            await callbacks.onPhaseComplete?.(phase)
            continue
          }

          if (type === 'report_created' && typeof event.title === 'string') {
            await callbacks.onReasoning?.(`Report created: ${event.title}`, phase)
            await callbacks.onReportCreated?.({
              reportId: typeof event.report_id === 'string' ? event.report_id : null,
              artifactId: typeof event.artifact_id === 'string' ? event.artifact_id : null,
              title: event.title,
            })
            continue
          }

          if (type === 'phase_error' || type === 'pipeline_error') {
            const message = typeof event.message === 'string' ? event.message : 'Pipeline execution failed'
            await fail(message, phase)
            return
          }

          if (type === 'pipeline_complete') {
            await callbacks.onPipelineComplete?.()
            await finish(0, 'Pipeline complete')
            return
          }
        } catch {
          // Ignore malformed SSE lines from upstream pipeline.
        }
      }
    }

    await finish(0, 'Pipeline stream closed')
  } catch (err) {
    await fail(`Execution error: ${safeString(err)}`)
  }
}
