import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Temporal HTTP API is available on the frontend service (port 8233 exposes REST endpoints)
// For listing workflows we use the Temporal Cloud/self-hosted HTTP API v1.
const TEMPORAL_HTTP = process.env.TEMPORAL_HTTP_URL ?? 'http://127.0.0.1:8233'

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(
      `${TEMPORAL_HTTP}/api/v1/namespaces/default/workflows?pageSize=20`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) {
      const fallback = await getFallbackWorkflowRuns()
      return NextResponse.json({
        workflows: fallback,
        error: `Temporal HTTP ${res.status}`,
        fallback: true,
      })
    }

    const data = (await res.json()) as {
      executions?: Array<{
        execution?: { workflowId?: string; runId?: string }
        type?: { name?: string }
        status?: number
        startTime?: string
        closeTime?: string
      }>
    }

    const workflows = (data.executions ?? []).map(w => ({
      workflowId: w.execution?.workflowId ?? '',
      runId:      w.execution?.runId ?? '',
      type:       w.type?.name ?? '',
      status:     mapStatus(w.status ?? 0),
      startTime:  w.startTime ?? null,
      closeTime:  w.closeTime ?? null,
    }))

    return NextResponse.json({ workflows })
  } catch {
    const fallback = await getFallbackWorkflowRuns()
    return NextResponse.json({
      workflows: fallback,
      error: 'Temporal unreachable',
      fallback: true,
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { workflowType?: string; taskQueue?: string; input?: unknown }
  const { workflowType, taskQueue = 'empire-workers', input = {} } = body

  if (!workflowType) {
    return NextResponse.json({ error: 'workflowType required' }, { status: 400 })
  }

  const workflowId = `${workflowType}-${Date.now()}`

  try {
    const res = await fetch(
      `${TEMPORAL_HTTP}/api/v1/namespaces/default/workflows`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          workflowType: { name: workflowType },
          taskQueue: { name: taskQueue },
          input: { payloads: [{ data: Buffer.from(JSON.stringify(input)).toString('base64') }] },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      const fallback = await queueFallbackWorkflow(workflowId, workflowType)
      return NextResponse.json({
        workflowId,
        started: false,
        queued: fallback,
        fallback: true,
        error: `Temporal rejected request: ${err || `HTTP ${res.status}`}`,
      }, { status: 202 })
    }

    return NextResponse.json({ workflowId, started: true })
  } catch (err: unknown) {
    const fallback = await queueFallbackWorkflow(workflowId, workflowType)
    return NextResponse.json({
      workflowId,
      started: false,
      queued: fallback,
      fallback: true,
      error: err instanceof Error ? err.message : 'Temporal unreachable',
    }, { status: 202 })
  }
}

function mapStatus(code: number): string {
  const map: Record<number, string> = {
    1: 'Running', 2: 'Completed', 3: 'Failed',
    4: 'Canceled', 5: 'Terminated', 6: 'ContinuedAsNew', 7: 'TimedOut',
  }
  return map[code] ?? 'Unknown'
}

async function queueFallbackWorkflow(workflowId: string, workflowType: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const { error } = await supabaseAdmin
    .from('runs')
    .insert({
      runner: `temporal:${workflowType}`,
      status: 'pending',
      summary: `Fallback queued workflow ${workflowId}`,
      task_id: null,
    })
  return !error
}

async function getFallbackWorkflowRuns(): Promise<Array<{
  workflowId: string
  runId: string
  type: string
  status: string
  startTime: string | null
  closeTime: string | null
}>> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from('runs')
    .select('id, runner, status, created_at, completed_at')
    .ilike('runner', 'temporal:%')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []

  return data.map((run: any) => {
    const type = typeof run.runner === 'string' && run.runner.startsWith('temporal:')
      ? run.runner.slice('temporal:'.length)
      : String(run.runner ?? 'UnknownWorkflow')
    return {
      workflowId: run.id,
      runId: run.id,
      type,
      status: mapRunStatus(run.status),
      startTime: run.created_at ?? null,
      closeTime: run.completed_at ?? null,
    }
  })
}

function mapRunStatus(status: string): string {
  const normalized = status?.toLowerCase?.() ?? 'unknown'
  if (normalized === 'running') return 'Running'
  if (normalized === 'completed' || normalized === 'complete') return 'Completed'
  if (normalized === 'failed') return 'Failed'
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Canceled'
  if (normalized === 'timed_out' || normalized === 'timedout') return 'TimedOut'
  return 'Unknown'
}
