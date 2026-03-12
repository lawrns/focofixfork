import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { dispatchOpenClawTask } from '@/lib/openclaw/client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const runId = params.id
  const body = await req.json().catch(() => ({}))
  const { prompt, preferredModel, context = {} } = body

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 })
  }

  try {
    // Get the max idx for this run_id
    const { data: maxIdxData } = await supabase
      .from('run_turns')
      .select('idx')
      .eq('run_id', runId)
      .order('idx', { ascending: false })
      .limit(1)
      .single()

    const nextIdx = (maxIdxData?.idx ?? -1) + 1

    // Create the new turn
    const { data: turn, error: turnError } = await supabase
      .from('run_turns')
      .insert({
        run_id: runId,
        idx: nextIdx,
        kind: nextIdx === 0 ? 'initial' : 'follow_up',
        prompt,
        status: 'pending',
        preferred_model: preferredModel ?? null,
        created_by: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (turnError || !turn) {
      return NextResponse.json({ error: turnError?.message ?? 'Failed to create turn' }, { status: 500 })
    }

    // Build callback URL
    const cookieStore = cookies()
    const host = req.headers.get('host') ?? 'localhost:4000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const callbackUrl = `${protocol}://${host}/api/runs/callback`

    // Dispatch to OpenClaw with execution framing
    const dispatchResult = await dispatchOpenClawTask({
      agentId: context.agentId ?? 'default',
      task: prompt,
      preferredModel: preferredModel ?? undefined,
      correlationId: turn.id,
      taskId: runId,
      callbackUrl,
      context: {
        ...context,
        run_turn_id: turn.id,
        run_id: runId,
        turn_idx: nextIdx,
        actor_user_id: user.id,
        agent_id: typeof context.agentId === 'string' ? context.agentId : 'default',
        ai_use_case: typeof context.ai_use_case === 'string' ? context.ai_use_case : 'command_surface_execute',
      },
    })

    // Update turn with gateway info
    await supabase
      .from('run_turns')
      .update({
        gateway_run_id: dispatchResult.runId ?? null,
        status: dispatchResult.accepted ? 'dispatched' : 'failed',
        trace: {
          ...turn.trace,
          dispatch: dispatchResult,
        },
      })
      .eq('id', turn.id)

    return NextResponse.json({
      runId,
      turnId: turn.id,
      status: dispatchResult.accepted ? 'dispatched' : 'failed',
      correlationId: dispatchResult.correlationId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
