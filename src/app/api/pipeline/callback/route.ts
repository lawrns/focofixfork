/**
 * POST /api/pipeline/callback
 * Called by ClawdBot when a pipeline phase completes.
 * Routes based on pipeline_phase embedded in the task ID or payload.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { appendHandbookLearnings } from '@/lib/pipeline/handbook-sync'
import { indexFromPipelineRun } from '@/features/memory'
import { sendTelegramAlert } from '@/lib/services/telegram'
import type { PlanResult, ExecutionResult, ReviewReport } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'DB not available' }, { status: 500 })
    }

    const body = await req.json()
    // ClawdBot sends: run_id (external), status, output, task_id, tokens_in, tokens_out, cost_usd, model, completed_at
    // task_id format: pipeline:{pipeline_run_id}:{phase}
    const { task_id, status, output, tokens_in, tokens_out, cost_usd, model, completed_at } = body

    if (!task_id) {
      return NextResponse.json({ ok: false, error: 'Missing task_id' }, { status: 400 })
    }

    // Parse pipeline routing from task_id
    const match = task_id.match(/^pipeline:([^:]+):([^:]+)$/)
    if (!match) {
      // Not a pipeline callback — ignore silently
      return NextResponse.json({ ok: true, skipped: true })
    }

    const pipelineRunId = match[1]
    const phase = match[2] as 'plan' | 'execute' | 'review'

    if (!['plan', 'execute', 'review'].includes(phase)) {
      return NextResponse.json({ ok: false, error: `Unknown phase: ${phase}` }, { status: 400 })
    }

    // Fetch the pipeline run
    const { data: run, error: fetchError } = await supabaseAdmin
      .from('pipeline_runs')
      .select('*')
      .eq('id', pipelineRunId)
      .single()

    if (fetchError || !run) {
      console.error('[Pipeline:callback] run not found:', pipelineRunId, fetchError)
      return NextResponse.json({ ok: false, error: 'Pipeline run not found' }, { status: 404 })
    }

    if (status === 'failed' || status === 'error') {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed' })
        .eq('id', pipelineRunId)
      return NextResponse.json({ ok: true })
    }

    // Parse output JSON
    let parsed: PlanResult | ExecutionResult | ReviewReport | null = null
    try {
      parsed = typeof output === 'string' ? JSON.parse(output) : output
    } catch {
      console.error('[Pipeline:callback] failed to parse output JSON for phase:', phase)
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed' })
        .eq('id', pipelineRunId)
      return NextResponse.json({ ok: false, error: 'Failed to parse output JSON' }, { status: 422 })
    }

    // Compute elapsed time from run's started_at if available
    const startedAt = run.started_at ? new Date(run.started_at).getTime() : null
    const elapsedMs = startedAt && completed_at ? new Date(completed_at).getTime() - startedAt : null

    if (phase === 'plan') {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          plan_result: parsed,
          status: 'executing',
          planner_tokens_in: tokens_in ?? 0,
          planner_tokens_out: tokens_out ?? 0,
          planner_elapsed_ms: elapsedMs,
          total_cost_usd: (run.total_cost_usd ?? 0) + (cost_usd ?? 0),
          plan_model_actual: model ?? run.plan_model_actual ?? null,
        })
        .eq('id', pipelineRunId)
    } else if (phase === 'execute') {
      const executionResult = parsed as ExecutionResult
      const filesChanged = executionResult.patches?.map((p) => p.file) ?? []
      // Heuristic: db_changes if any patch targets a migration file
      const dbChanges = filesChanged.some(
        (f) => f.includes('migration') || f.includes('.sql') || f.includes('supabase/')
      )

      // If auto_reviewed is set on the run, go straight to reviewing
      const nextStatus = run.auto_reviewed ? 'reviewing' : 'complete'

      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          execution_result: parsed,
          files_changed: filesChanged,
          db_changes: dbChanges,
          status: nextStatus,
          executor_tokens_in: tokens_in ?? 0,
          executor_tokens_out: tokens_out ?? 0,
          executor_elapsed_ms: elapsedMs,
          total_cost_usd: (run.total_cost_usd ?? 0) + (cost_usd ?? 0),
          execute_model_actual: model ?? run.execute_model_actual ?? null,
        })
        .eq('id', pipelineRunId)
    } else if (phase === 'review') {
      const reviewResult = parsed as ReviewReport
      const updates: Record<string, unknown> = {
        review_result: reviewResult,
        status: 'complete',
        reviewer_tokens_in: tokens_in ?? 0,
        reviewer_tokens_out: tokens_out ?? 0,
        reviewer_elapsed_ms: elapsedMs,
        total_cost_usd: (run.total_cost_usd ?? 0) + (cost_usd ?? 0),
        review_model_actual: model ?? run.review_model_actual ?? null,
      }

      // Append handbook learnings if additions exist
      if (reviewResult.handbook_additions?.length > 0) {
        const slug = run.handbook_ref ?? 'general'
        try {
          await appendHandbookLearnings(slug, reviewResult.handbook_additions, run.task_description)
          updates.handbook_ref = slug
        } catch (syncErr) {
          console.error('[Pipeline:callback] handbook sync failed:', syncErr)
          // Don't fail the callback — just log
        }
      }

      // Index learnings into project memory (Module 6)
      if (run.project_id) {
        try {
          const learnings: string[] = []
          
          // Extract learnings from review result
          if (reviewResult.summary) {
            learnings.push(`Review Summary: ${reviewResult.summary}`)
          }
          if (reviewResult.critical_issues?.length) {
            learnings.push(`Critical Issues: ${reviewResult.critical_issues.join(', ')}`)
          }
          if (reviewResult.improvements?.length) {
            learnings.push(`Improvements: ${reviewResult.improvements.join(', ')}`)
          }
          if (reviewResult.handbook_additions?.length) {
            learnings.push(...reviewResult.handbook_additions.map((a: any) => 
              `Pattern: ${a.pattern} - ${a.lesson}`
            ))
          }
          
          if (learnings.length > 0) {
            await indexFromPipelineRun(run.project_id, pipelineRunId, learnings, 'review')
          }
        } catch (memErr) {
          console.error('[Pipeline:callback] memory index failed:', memErr)
          // Don't fail the callback — just log
        }
      }

      await supabaseAdmin
        .from('pipeline_runs')
        .update(updates)
        .eq('id', pipelineRunId)

      // Telegram alert on pipeline completion
      const verdict = reviewResult.confidence_score >= 70 ? 'pass' : 'needs-review'
      const totalCost = ((run.total_cost_usd ?? 0) + (cost_usd ?? 0)).toFixed(4)
      sendTelegramAlert(
        `\uD83D\uDD27 Pipeline done: ${run.task_description ?? pipelineRunId}\nVerdict: ${verdict}\nCost: $${totalCost}`
      ).catch(() => {})

      // Trigger project health recalculation (Phase D1)
      const projectId = run.project_id
      if (projectId) {
        const port = process.env.PORT ?? '3000'
        const internalToken = process.env.DELEGATION_INTERNAL_TOKEN ?? ''
        fetch(`http://127.0.0.1:${port}/api/cron/project-health?project_id=${projectId}`, {
          headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
          signal: AbortSignal.timeout(5000),
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Pipeline:callback] unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
