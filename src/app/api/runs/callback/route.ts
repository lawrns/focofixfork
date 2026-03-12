import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolveSessionFromDisk } from '@/lib/openclaw/session-resolver'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    
    // Extract key fields from callback
    const {
      run_id: gatewayRunId,
      correlation_id: correlationId,
      status: gatewayStatus,
      result,
      error: gatewayError,
    } = payload

    if (!correlationId) {
      return NextResponse.json({ error: 'correlation_id required' }, { status: 400 })
    }

    // Find the turn by correlation_id
    const { data: turn, error: turnError } = await supabaseAdmin
      .from('run_turns')
      .select('*')
      .eq('id', correlationId)
      .single()

    if (turnError || !turn) {
      // Try by gateway_run_id as fallback
      const { data: turnByGateway } = await supabaseAdmin
        .from('run_turns')
        .select('*')
        .eq('gateway_run_id', gatewayRunId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!turnByGateway) {
        return NextResponse.json({ error: 'Turn not found' }, { status: 404 })
      }
    }

    const targetTurn = turn!

    // Determine outcome_kind based on evidence
    let outcomeKind: string | null = null
    let finalStatus = gatewayStatus ?? 'completed'
    let output = ''
    let summary = ''

    if (gatewayStatus === 'failed' || gatewayError) {
      outcomeKind = 'failed'
      finalStatus = 'failed'
    } else if (result) {
      // Analyze result for evidence
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
      output = resultStr

      // Check for execution evidence
      const hasCodeChanges = /git|commit|push|pr|pull request/i.test(resultStr)
      const hasFileOps = /created|modified|deleted|wrote|saved/i.test(resultStr)
      const hasToolCalls = /tool|function|exec|fetch|read|write/i.test(resultStr)
      const isAdvisory = /suggest|recommend|advise|consider|could|might/i.test(resultStr) && !hasCodeChanges && !hasFileOps

      if (hasCodeChanges || hasFileOps || hasToolCalls) {
        outcomeKind = 'executed'
      } else if (isAdvisory) {
        outcomeKind = 'advisory'
      } else {
        outcomeKind = 'no_evidence'
      }

      // Extract summary
      const lines = resultStr.split('\n').filter(l => l.trim())
      summary = lines[0]?.slice(0, 200) ?? 'Completed'
    } else {
      outcomeKind = 'no_evidence'
      summary = 'No output received'
    }

    // Try to resolve session from disk
    const sessionData = await resolveSessionFromDisk(targetTurn.run_id, correlationId)

    // Update the turn
    const { error: updateError } = await supabaseAdmin
      .from('run_turns')
      .update({
        status: finalStatus,
        outcome_kind: outcomeKind,
        output: output.slice(0, 10000), // Limit size
        summary,
        session_path: sessionData?.path ?? null,
        ended_at: new Date().toISOString(),
        trace: {
          ...targetTurn.trace,
          callback: payload,
          session: sessionData ? {
            path: sessionData.path,
            has_assistant_output: !!sessionData.assistant_output,
            tool_count: sessionData.tool_markers?.length ?? 0,
          } : null,
        },
      })
      .eq('id', targetTurn.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update parent run if needed
    await supabaseAdmin
      .from('runs')
      .update({
        status: finalStatus === 'failed' ? 'failed' : 'completed',
        ended_at: new Date().toISOString(),
        summary: summary.slice(0, 500),
      })
      .eq('id', targetTurn.run_id)

    return NextResponse.json({
      ok: true,
      turnId: targetTurn.id,
      runId: targetTurn.run_id,
      outcome_kind: outcomeKind,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
