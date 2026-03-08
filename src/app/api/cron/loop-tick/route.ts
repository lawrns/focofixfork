import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { claimLoopTick, dispatchLoopIteration } from '@/lib/autonomy/loops'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // If no secret configured, allow (dev mode)
  const authHeader = req.headers.get('authorization')
  const secretHeader = req.headers.get('x-cron-secret')
  return authHeader === `Bearer ${cronSecret}` || secretHeader === cronSecret
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let processed = 0
  let skipped = 0
  const errors: string[] = []

  try {
    // Find all due active loops
    const { data: dueLoops, error: fetchError } = await supabase
      .from('cofounder_loops')
      .select('id, user_id, loop_type, schedule_kind, schedule_value, timezone, execution_backend, execution_target, planning_agent, selected_project_ids, git_strategy, config, workspace_id')
      .eq('status', 'active')
      .is('deleted_at', null)
      .lte('next_tick_at', new Date().toISOString())
      .order('next_tick_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('[loop-tick] Failed to query due loops:', fetchError.message)
      return NextResponse.json({ error: 'Failed to query due loops', detail: fetchError.message }, { status: 500 })
    }

    const loops = dueLoops ?? []
    console.log(`[loop-tick] Found ${loops.length} due loop(s)`)

    for (const loop of loops) {
      try {
        // Attempt to claim this tick (prevents double-processing)
        const tickResult = await claimLoopTick(supabase, loop.id)
        if (!tickResult.claimed) {
          console.log(`[loop-tick] Loop ${loop.id} skipped: ${tickResult.reason}`)
          skipped++
          continue
        }

        // Fetch user email for dispatch context
        const { data: userRow } = await supabase.auth.admin.getUserById(loop.user_id)
        const userEmail = userRow?.user?.email ?? null

        // Dispatch an iteration for this loop
        await dispatchLoopIteration({
          supabase,
          loop: tickResult.loop,
          userId: loop.user_id,
          userEmail,
          workspaceId: loop.workspace_id,
        })
        processed++
        console.log(`[loop-tick] Dispatched iteration for loop ${loop.id}`)
      } catch (loopError: unknown) {
        const message = loopError instanceof Error ? loopError.message : 'Unknown error'
        console.error(`[loop-tick] Error processing loop ${loop.id}:`, message)
        errors.push(`loop ${loop.id}: ${message}`)
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      skipped,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[loop-tick] Unexpected error:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
