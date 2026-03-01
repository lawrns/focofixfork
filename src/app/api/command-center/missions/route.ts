import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import type { UnifiedMission, AgentBackend } from '@/lib/command-center/types'
import type { Run } from '@/lib/types/runs'

export const dynamic = 'force-dynamic'

// ── GET — list missions (mapped from runs table) ───────────────────────────────

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const missions: UnifiedMission[] = (data as Run[]).map(run => ({
    id: run.id,
    title: run.runner,
    description: run.summary ?? undefined,
    status: mapRunStatus(run.status),
    assignedAgentIds: [],
    backend: detectBackend(run.runner),
    nativeRunId: run.id,
    createdAt: run.created_at,
  }))

  return NextResponse.json({ missions })
}

// ── POST — create mission → dispatch to correct backend ───────────────────────

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { title, description, backend, agentIds, ...backendFields } = body as {
    title: string
    description?: string
    backend: AgentBackend
    agentIds?: string[]
    [key: string]: unknown
  }

  if (!title || !backend) {
    return NextResponse.json({ error: 'title and backend are required' }, { status: 400 })
  }

  // Write a run record for tracking
  const { data: runData, error: runError } = await supabase
    .from('runs')
    .insert({ runner: title, status: 'pending', task_id: null })
    .select()
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  // Also dispatch to backend-specific endpoint (fire-and-forget style, errors logged)
  try {
    await dispatchToBackend(backend, title, description, backendFields, req)
  } catch {
    // Non-fatal — run record already created
  }

  const mission: UnifiedMission = {
    id: runData.id,
    title,
    description,
    status: 'pending',
    assignedAgentIds: agentIds ?? [],
    backend,
    nativeRunId: runData.id,
    createdAt: runData.created_at,
  }

  return NextResponse.json({ mission }, { status: 201 })
}

// ── DELETE — cancel a mission ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbError } = await supabase
    .from('runs')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapRunStatus(status: string): UnifiedMission['status'] {
  if (status === 'running') return 'active'
  if (status === 'completed') return 'met'
  if (status === 'failed') return 'failed'
  return 'pending'
}

function detectBackend(runner: string): AgentBackend {
  const r = runner.toLowerCase()
  if (r.includes('crico')) return 'crico'
  if (r.includes('clawdbot') || r.includes('intel')) return 'clawdbot'
  if (r.includes('bosun')) return 'bosun'
  return 'openclaw'
}

async function dispatchToBackend(
  backend: AgentBackend,
  title: string,
  description: string | undefined,
  fields: Record<string, unknown>,
  req: NextRequest
) {
  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  switch (backend) {
    case 'openclaw':
      await fetch(`${origin}/api/openclaw-gateway/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: fields.agentId ?? '', task: title }),
      })
      break
    // crico, bosun, clawdbot — handled via their own control surfaces
    default:
      break
  }
}
