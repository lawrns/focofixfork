import { NextRequest, NextResponse } from 'next/server'

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
      return NextResponse.json({ workflows: [], error: `Temporal HTTP ${res.status}` })
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
    return NextResponse.json({ workflows: [], error: 'Temporal unreachable' })
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
      return NextResponse.json({ error: err }, { status: res.status })
    }

    return NextResponse.json({ workflowId, started: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Temporal unreachable' },
      { status: 503 }
    )
  }
}

function mapStatus(code: number): string {
  const map: Record<number, string> = {
    1: 'Running', 2: 'Completed', 3: 'Failed',
    4: 'Canceled', 5: 'Terminated', 6: 'ContinuedAsNew', 7: 'TimedOut',
  }
  return map[code] ?? 'Unknown'
}
