/**
 * POST /api/pipeline/stream
 *
 * SSE endpoint for the full pipeline lifecycle.
 * Creates DB row → streams planning via ClawdBot /tasks/stream →
 * dispatches execution/review with polling → relays all events to client.
 *
 * Event protocol: each line is `data: {json}\n\n` per SSE spec.
 * See PipelineSSEEvent in types.ts for the event schema.
 */

import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { PIPELINE_PROMPTS } from '@/lib/pipeline/dispatcher'
import { buildPlanContext, buildExecuteContext, buildReviewContext } from '@/lib/pipeline/context-builder'
import { listHandbooks } from '@/lib/handbook/handbook-loader'
import type { PlanResult, ExecutionResult, ReviewReport, PipelinePhase } from '@/lib/pipeline/types'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min max for streaming

const CLAWDBOT_BASE = process.env.CLAWDBOT_API_URL || 'http://127.0.0.1:18794'
const CLAWDBOT_TOKEN = process.env.OPENCLAW_SERVICE_TOKEN ?? ''

function getCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://127.0.0.1:3000'
  const normalized = base.startsWith('http') ? base : `https://${base}`
  return `${normalized}/api/pipeline/callback`
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthUser(req)
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json()
  const {
    task_description,
    planner_model: requested_planner_model = null,
    executor_model: requested_executor_model = null,
    reviewer_model: requested_reviewer_model = null,
    auto_review = false,
    handbook_slug = 'general',
    project_id = null,
    workspace_id = null,
    selected_agents = null,
    context = null,
    planning_goal = null,
    constraints = null,
    limits = null,
  } = body

  if (!task_description?.trim()) {
    return new Response(JSON.stringify({ error: 'task_description is required' }), { status: 400 })
  }

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 })
  }

  const workspaceId = workspace_id ?? null
  const [{ profile: plannerProfile }, { profile: executorProfile }, { profile: reviewerProfile }] = await Promise.all([
    resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId,
      useCase: 'pipeline_plan',
      requestedModel: requested_planner_model,
    }),
    resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId,
      useCase: 'pipeline_execute',
      requestedModel: requested_executor_model,
    }),
    resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId,
      useCase: 'pipeline_review',
      requestedModel: requested_reviewer_model,
    }),
  ])
  const planner_model = plannerProfile.model
  const executor_model = executorProfile.model
  const reviewer_model = reviewerProfile.model

  // Create pipeline run in DB
  const startedAt = new Date().toISOString()
  const { data: run, error: insertError } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      task_description: task_description.trim(),
      planner_model,
      executor_model,
      reviewer_model,
      routing_profile_id: plannerProfile.routing_profile_id,
      provider_chain: Array.from(new Set([
        ...plannerProfile.fallback_chain,
        ...executorProfile.fallback_chain,
        ...reviewerProfile.fallback_chain,
      ])),
      status: 'planning',
      auto_reviewed: auto_review,
      handbook_ref: handbook_slug || null,
      started_at: startedAt,
      ...(project_id ? { project_id } : {}),
    })
    .select('id')
    .single()

  if (insertError || !run) {
    return new Response(JSON.stringify({ error: 'Failed to create pipeline run' }), { status: 500 })
  }

  const runId = run.id
  const pipelineStartMs = Date.now()

  // Create readable stream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Stream closed by client
        }
      }

      // ── Run Start ───────────────────────────────────────────────────────
      emit({ type: 'run_start', run_id: runId, started_at: pipelineStartMs })
      emit({
        type: 'activity',
        phase: 'system',
        message: `Routing profile ${plannerProfile.routing_profile_id ?? 'env'}: ${planner_model} -> ${executor_model} -> ${reviewer_model}`,
      })
      emit({ type: 'activity', phase: 'system', message: 'Pipeline started' })

      // ── Phase 1: Planning (streaming via ClawdBot) ──────────────────────
      emit({ type: 'phase_start', phase: 'plan', model: planner_model })
      emit({ type: 'activity', phase: 'plan', message: `Dispatching to ${planner_model}` })

      const planContext = buildPlanContext(task_description, {
        selected_agents,
        context,
        planning_goal,
        constraints,
        limits,
      })
      const planTaskId = `pipeline:${runId}:plan`
      const planSystemPrompt = `${PIPELINE_PROMPTS.plan}\n\n# Preferred Model\n${planner_model}\n\n# Pipeline Run ID\n${runId}\n\n# Phase\nplan`

      let planOutput = ''
      let planTokensIn = 0
      let planTokensOut = 0
      let planCostUsd = 0
      let planElapsedMs = 0
      let planTtftMs: number | null = null
      let planModelActual = planner_model
      let planSuccess = false

      try {
        // Try streaming endpoint first
        const streamRes = await fetch(`${CLAWDBOT_BASE}/tasks/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            task_id: planTaskId,
            title: `[Pipeline:PLAN] ${task_description.slice(0, 120)}`,
            description: planContext,
            system_prompt: planSystemPrompt,
            preferred_model: planner_model,
          }),
          signal: AbortSignal.timeout(240_000), // 4 min timeout
        })

        if (!streamRes.ok || !streamRes.body) {
          throw new Error(`ClawdBot stream ${streamRes.status}`)
        }

        // Parse SSE from ClawdBot
        const reader = streamRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let outputTokenEstimate = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE messages
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'text_delta') {
                planOutput += event.text
                outputTokenEstimate++
                emit({ type: 'text_delta', phase: 'plan', text: event.text })
                // Emit running token count every ~20 tokens
                if (outputTokenEstimate % 20 === 0) {
                  emit({ type: 'activity', phase: 'plan', message: `Generating… ~${outputTokenEstimate} tokens` })
                }
              } else if (event.type === 'ttft') {
                planTtftMs = event.ms
                emit({ type: 'ttft', phase: 'plan', ms: event.ms })
                emit({ type: 'activity', phase: 'plan', message: `Claude responded (TTFT: ${event.ms}ms)` })
              } else if (event.type === 'usage') {
                planTokensIn = event.input_tokens
                planTokensOut = event.output_tokens
                planCostUsd = event.cost_usd ?? 0
                planModelActual = event.model ?? planModelActual
                emit({
                  type: 'usage',
                  phase: 'plan',
                  input_tokens: planTokensIn,
                  output_tokens: planTokensOut,
                  cost_usd: planCostUsd,
                  model: event.model ?? planner_model,
                })
              } else if (event.type === 'done') {
                planOutput = event.output ?? planOutput
                planElapsedMs = event.elapsed_ms ?? (Date.now() - pipelineStartMs)
                planSuccess = true
              } else if (event.type === 'error') {
                throw new Error(event.message ?? 'ClawdBot streaming error')
              }
            } catch (parseErr) {
              // Skip malformed SSE lines
              if (parseErr instanceof Error && parseErr.message.includes('ClawdBot')) throw parseErr
            }
          }
        }

        if (!planSuccess && planOutput.length > 0) {
          planSuccess = true
          planElapsedMs = Date.now() - pipelineStartMs
        }
      } catch (streamErr) {
        // Fallback: try non-streaming dispatch
        emit({ type: 'activity', phase: 'plan', message: 'Streaming unavailable, using async dispatch…' })

        try {
          const res = await fetch(`${CLAWDBOT_BASE}/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
            },
            body: JSON.stringify({
              task_id: planTaskId,
              title: `[Pipeline:PLAN] ${task_description.slice(0, 120)}`,
              description: planContext,
              system_prompt: planSystemPrompt,
              preferred_model: planner_model,
              callback_url: getCallbackUrl(),
            }),
            signal: AbortSignal.timeout(10_000),
          })

          if (!res.ok) throw new Error(`ClawdBot dispatch ${res.status}`)
          const data = await res.json()

          // Poll ClawdBot for completion
          const externalRunId = data.run_id ?? data.id
          if (externalRunId) {
            emit({ type: 'activity', phase: 'plan', message: `Queued as ${externalRunId}, polling…` })
            const pollResult = await pollClawdBotTask(externalRunId, (msg) => {
              emit({ type: 'activity', phase: 'plan', message: msg })
            })
            if (pollResult) {
              planOutput = pollResult.output ?? ''
              planTokensIn = pollResult.tokens_in ?? 0
              planTokensOut = pollResult.tokens_out ?? 0
              planElapsedMs = Date.now() - pipelineStartMs
              planSuccess = true
            }
          }
        } catch (fallbackErr) {
          const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'
          emit({ type: 'phase_error', phase: 'plan', message: msg })
          emit({ type: 'activity', phase: 'system', message: `Planning failed: ${msg}` })
          await supabaseAdmin.from('pipeline_runs').update({ status: 'failed' }).eq('id', runId)
          emit({ type: 'pipeline_error', message: msg })
          controller.close()
          return
        }
      }

      if (!planSuccess) {
        emit({ type: 'phase_error', phase: 'plan', message: 'No plan output received' })
        await supabaseAdmin.from('pipeline_runs').update({ status: 'failed' }).eq('id', runId)
        emit({ type: 'pipeline_error', message: 'Planning phase failed' })
        controller.close()
        return
      }

      // Parse plan result
      let planResult: PlanResult | null = null
      try {
        // Try to extract JSON from the output (may have markdown wrapping)
        const jsonMatch = planOutput.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          planResult = JSON.parse(jsonMatch[0]) as PlanResult
        }
      } catch {
        // If JSON parse fails, create a synthetic plan result
        planResult = {
          summary: planOutput.slice(0, 200),
          steps: [],
          files_to_modify: [],
          risks: [],
          db_implications: [],
          validation_strategy: '',
          estimated_complexity: 'medium',
          selected_agents: [],
          agent_perspectives: [],
        }
      }

      emit({
        type: 'phase_complete',
        phase: 'plan',
        elapsed_ms: planElapsedMs,
        result: planResult,
      })
      emit({
        type: 'activity',
        phase: 'plan',
        message: `Plan complete — ${planResult?.steps?.length ?? 0} steps, ${planTokensOut} tokens, ${(planElapsedMs / 1000).toFixed(1)}s`,
      })

      // Save plan to DB
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          plan_result: planResult,
          status: 'executing',
          planner_tokens_in: planTokensIn,
          planner_tokens_out: planTokensOut,
          planner_ttft_ms: planTtftMs,
          planner_elapsed_ms: planElapsedMs,
          total_cost_usd: planCostUsd,
          plan_model_actual: planModelActual,
        })
        .eq('id', runId)

      // ── Phase 2: Execution (dispatch + poll) ──────────────────────────────
      emit({ type: 'phase_start', phase: 'execute', model: executor_model })
      emit({ type: 'activity', phase: 'execute', message: `Dispatching to ${executor_model}` })

      const execContext = buildExecuteContext(task_description, planResult!)
      const execTaskId = `pipeline:${runId}:execute`
      const execSystemPrompt = `${PIPELINE_PROMPTS.execute}\n\n# Preferred Model\n${executor_model}\n\n# Pipeline Run ID\n${runId}\n\n# Phase\nexecute`

      let execOutput = ''
      let execTokensIn = 0
      let execTokensOut = 0
      let execCostUsd = 0
      let execElapsedMs = 0
      let execModelActual = executor_model
      let execSuccess = false

      try {
        // Try streaming for execution too
        const execPhaseStart = Date.now()
        const streamRes = await fetch(`${CLAWDBOT_BASE}/tasks/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            task_id: execTaskId,
            title: `[Pipeline:EXECUTE] ${task_description.slice(0, 120)}`,
            description: execContext,
            system_prompt: execSystemPrompt,
            preferred_model: executor_model,
          }),
          signal: AbortSignal.timeout(240_000),
        })

        if (!streamRes.ok || !streamRes.body) {
          throw new Error(`ClawdBot stream ${streamRes.status}`)
        }

        const reader = streamRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let outputTokenEstimate = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'text_delta') {
                execOutput += event.text
                outputTokenEstimate++
                emit({ type: 'text_delta', phase: 'execute', text: event.text })
              } else if (event.type === 'ttft') {
                emit({ type: 'ttft', phase: 'execute', ms: event.ms })
                emit({ type: 'activity', phase: 'execute', message: `${executor_model} responded (TTFT: ${event.ms}ms)` })
              } else if (event.type === 'usage') {
                execTokensIn = event.input_tokens
                execTokensOut = event.output_tokens
                execCostUsd = event.cost_usd ?? 0
                execModelActual = event.model ?? execModelActual
                emit({ type: 'usage', phase: 'execute', input_tokens: execTokensIn, output_tokens: execTokensOut, cost_usd: execCostUsd, model: event.model ?? executor_model })
              } else if (event.type === 'done') {
                execOutput = event.output ?? execOutput
                execElapsedMs = event.elapsed_ms ?? (Date.now() - execPhaseStart)
                execSuccess = true
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && !parseErr.message.includes('JSON')) throw parseErr
            }
          }
        }

        if (!execSuccess && execOutput.length > 0) {
          execSuccess = true
          execElapsedMs = Date.now() - execPhaseStart
        }
      } catch {
        // Fallback: non-streaming dispatch + poll
        emit({ type: 'activity', phase: 'execute', message: 'Streaming unavailable, using async dispatch…' })
        try {
          const res = await fetch(`${CLAWDBOT_BASE}/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
            },
            body: JSON.stringify({
              task_id: execTaskId,
              title: `[Pipeline:EXECUTE] ${task_description.slice(0, 120)}`,
              description: execContext,
              system_prompt: execSystemPrompt,
              preferred_model: executor_model,
              callback_url: getCallbackUrl(),
            }),
            signal: AbortSignal.timeout(10_000),
          })

          if (!res.ok) throw new Error(`Execute dispatch ${res.status}`)
          const data = await res.json()
          const externalRunId = data.run_id ?? data.id

          if (externalRunId) {
            emit({ type: 'activity', phase: 'execute', message: `Queued as ${externalRunId}, polling…` })
            const pollResult = await pollClawdBotTask(externalRunId, (msg) => {
              emit({ type: 'activity', phase: 'execute', message: msg })
            })
            if (pollResult) {
              execOutput = pollResult.output ?? ''
              execTokensIn = pollResult.tokens_in ?? 0
              execTokensOut = pollResult.tokens_out ?? 0
              execElapsedMs = Date.now() - pipelineStartMs
              execSuccess = true
            }
          }
        } catch (fbErr) {
          const msg = fbErr instanceof Error ? fbErr.message : 'Unknown error'
          emit({ type: 'phase_error', phase: 'execute', message: msg })
          emit({ type: 'activity', phase: 'system', message: `Execution failed: ${msg}` })
          await supabaseAdmin.from('pipeline_runs').update({ status: 'failed' }).eq('id', runId)
          emit({ type: 'pipeline_error', message: msg })
          controller.close()
          return
        }
      }

      // Parse execution result
      let execResult: ExecutionResult | null = null
      try {
        const jsonMatch = execOutput.match(/\{[\s\S]*\}/)
        if (jsonMatch) execResult = JSON.parse(jsonMatch[0]) as ExecutionResult
      } catch {
        execResult = {
          summary: execOutput.slice(0, 200),
          patches: [],
          commands_suggested: [],
          warnings: [],
          notes: '',
        }
      }

      const filesChanged = execResult?.patches?.map((p) => p.file) ?? []
      const dbChanges = filesChanged.some((f) => f.includes('migration') || f.includes('.sql'))

      emit({
        type: 'phase_complete',
        phase: 'execute',
        elapsed_ms: execElapsedMs,
        result: execResult,
      })
      emit({
        type: 'activity',
        phase: 'execute',
        message: `Execution done — ${execResult?.patches?.length ?? 0} patches, ${execTokensOut} tokens, ${(execElapsedMs / 1000).toFixed(1)}s`,
      })

      const nextStatus = auto_review ? 'reviewing' : 'complete'
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          execution_result: execResult,
          files_changed: filesChanged,
          db_changes: dbChanges,
          status: nextStatus,
          executor_tokens_in: execTokensIn,
          executor_tokens_out: execTokensOut,
          executor_elapsed_ms: execElapsedMs,
          total_cost_usd: planCostUsd + execCostUsd,
          execute_model_actual: execModelActual,
        })
        .eq('id', runId)

      // ── Phase 3: Review (if auto-review enabled) ──────────────────────────
      if (auto_review && execResult) {
        emit({ type: 'phase_start', phase: 'review', model: reviewer_model })
        emit({ type: 'activity', phase: 'review', message: `Dispatching to ${reviewer_model}` })

        const migrationFiles = await listHandbooks().catch(() => [] as string[])
        const reviewContext = buildReviewContext(task_description, planResult!, execResult, migrationFiles)
        const reviewTaskId = `pipeline:${runId}:review`
        const reviewSystemPrompt = `${PIPELINE_PROMPTS.review}\n\n# Preferred Model\n${reviewer_model}\n\n# Pipeline Run ID\n${runId}\n\n# Phase\nreview`

        let reviewOutput = ''
        let reviewTokensIn = 0
        let reviewTokensOut = 0
        let reviewCostUsd = 0
        let reviewElapsedMs = 0
        let reviewModelActual = reviewer_model
        let reviewSuccess = false

        try {
          const reviewPhaseStart = Date.now()
          const streamRes = await fetch(`${CLAWDBOT_BASE}/tasks/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
            },
            body: JSON.stringify({
              task_id: reviewTaskId,
              title: `[Pipeline:REVIEW] ${task_description.slice(0, 120)}`,
              description: reviewContext,
              system_prompt: reviewSystemPrompt,
              preferred_model: reviewer_model,
            }),
            signal: AbortSignal.timeout(240_000),
          })

          if (!streamRes.ok || !streamRes.body) throw new Error(`Stream ${streamRes.status}`)

          const reader = streamRes.body.getReader()
          const decoder = new TextDecoder()
          let buf = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })

            const lines = buf.split('\n')
            buf = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const event = JSON.parse(line.slice(6))
                if (event.type === 'text_delta') {
                  reviewOutput += event.text
                  emit({ type: 'text_delta', phase: 'review', text: event.text })
                } else if (event.type === 'ttft') {
                  emit({ type: 'ttft', phase: 'review', ms: event.ms })
                  emit({ type: 'activity', phase: 'review', message: `${reviewer_model} responded (TTFT: ${event.ms}ms)` })
                } else if (event.type === 'usage') {
                  reviewTokensIn = event.input_tokens
                  reviewTokensOut = event.output_tokens
                  reviewCostUsd = event.cost_usd ?? 0
                  reviewModelActual = event.model ?? reviewModelActual
                  emit({ type: 'usage', phase: 'review', input_tokens: reviewTokensIn, output_tokens: reviewTokensOut, cost_usd: reviewCostUsd, model: event.model ?? reviewer_model })
                } else if (event.type === 'done') {
                  reviewOutput = event.output ?? reviewOutput
                  reviewElapsedMs = event.elapsed_ms ?? (Date.now() - reviewPhaseStart)
                  reviewSuccess = true
                } else if (event.type === 'error') {
                  throw new Error(event.message)
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && !parseErr.message.includes('JSON')) throw parseErr
              }
            }
          }

          if (!reviewSuccess && reviewOutput.length > 0) {
            reviewSuccess = true
            reviewElapsedMs = Date.now() - reviewPhaseStart
          }
        } catch {
          // Fallback: non-streaming dispatch
          try {
            const res = await fetch(`${CLAWDBOT_BASE}/tasks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {}),
              },
              body: JSON.stringify({
                task_id: reviewTaskId,
                title: `[Pipeline:REVIEW] ${task_description.slice(0, 120)}`,
                description: reviewContext,
                system_prompt: reviewSystemPrompt,
                preferred_model: reviewer_model,
                callback_url: getCallbackUrl(),
              }),
              signal: AbortSignal.timeout(10_000),
            })

            if (!res.ok) throw new Error(`Review dispatch ${res.status}`)
            const data = await res.json()
            const externalRunId = data.run_id ?? data.id

            if (externalRunId) {
              emit({ type: 'activity', phase: 'review', message: `Queued as ${externalRunId}, polling…` })
              const pollResult = await pollClawdBotTask(externalRunId, (msg) => {
                emit({ type: 'activity', phase: 'review', message: msg })
              })
              if (pollResult) {
                reviewOutput = pollResult.output ?? ''
                reviewTokensIn = pollResult.tokens_in ?? 0
                reviewTokensOut = pollResult.tokens_out ?? 0
                reviewElapsedMs = Date.now() - pipelineStartMs
                reviewSuccess = true
              }
            }
          } catch (fbErr) {
            const msg = fbErr instanceof Error ? fbErr.message : 'Unknown error'
            emit({ type: 'phase_error', phase: 'review', message: msg })
            emit({ type: 'activity', phase: 'system', message: `Review failed: ${msg}` })
          }
        }

        if (reviewSuccess) {
          let reviewResult: ReviewReport | null = null
          try {
            const jsonMatch = reviewOutput.match(/\{[\s\S]*\}/)
            if (jsonMatch) reviewResult = JSON.parse(jsonMatch[0]) as ReviewReport
          } catch {
            reviewResult = null
          }

          emit({
            type: 'phase_complete',
            phase: 'review',
            elapsed_ms: reviewElapsedMs,
            result: reviewResult,
          })
          emit({
            type: 'activity',
            phase: 'review',
            message: `Review done — confidence ${reviewResult?.confidence_score ?? '?'}%, ${reviewTokensOut} tokens`,
          })

          await supabaseAdmin
            .from('pipeline_runs')
            .update({
              review_result: reviewResult,
              status: 'complete',
              reviewer_tokens_in: reviewTokensIn,
              reviewer_tokens_out: reviewTokensOut,
              reviewer_elapsed_ms: reviewElapsedMs,
              total_cost_usd: planCostUsd + execCostUsd + reviewCostUsd,
              review_model_actual: reviewModelActual,
            })
            .eq('id', runId)
        } else {
          // Review failed but execution succeeded — mark complete
          await supabaseAdmin
            .from('pipeline_runs')
            .update({ status: 'complete' })
            .eq('id', runId)
        }
      }

      // ── Pipeline Complete ──────────────────────────────────────────────────
      const totalElapsedMs = Date.now() - pipelineStartMs
      emit({
        type: 'pipeline_complete',
        run_id: runId,
        total_elapsed_ms: totalElapsedMs,
        hierarchy: {
          routing_profile_id: plannerProfile.routing_profile_id,
          plan: planner_model,
          execute: executor_model,
          review: reviewer_model,
        },
      })
      emit({
        type: 'activity',
        phase: 'system',
        message: `Pipeline complete — ${(totalElapsedMs / 1000).toFixed(1)}s total`,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── ClawdBot polling helper ───────────────────────────────────────────────────

async function pollClawdBotTask(
  runId: string,
  onActivity: (msg: string) => void,
  timeoutMs = 240_000,
  intervalMs = 2_000,
): Promise<{ output: string; tokens_in: number; tokens_out: number; cost_usd: number } | null> {
  const deadline = Date.now() + timeoutMs
  let lastStatus = ''

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${CLAWDBOT_BASE}/tasks/${runId}`, {
        headers: CLAWDBOT_TOKEN ? { Authorization: `Bearer ${CLAWDBOT_TOKEN}` } : {},
        signal: AbortSignal.timeout(5_000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.status !== lastStatus) {
          lastStatus = data.status
          onActivity(`Status: ${data.status}`)
        }

        if (data.status === 'completed') {
          return {
            output: data.output ?? '',
            tokens_in: data.tokens_in ?? 0,
            tokens_out: data.tokens_out ?? 0,
            cost_usd: data.cost_usd ?? 0,
          }
        }

        if (data.status === 'failed') {
          throw new Error(data.error ?? 'Task failed on ClawdBot')
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Task failed')) throw err
      // Network error — retry
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('ClawdBot task timed out')
}
