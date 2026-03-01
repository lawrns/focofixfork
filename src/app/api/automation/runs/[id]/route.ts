import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// GET /api/automation/runs/[id] — get single automation run with ledger events
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  // Get run with job info for access check
  const { data: run, error: runError } = await supabase
    .from('automation_runs')
    .select(`
      *,
      job:automation_jobs(
        id, name, handler, job_type, workspace_id,
        workspace:foco_workspaces(id, name, slug)
      )
    `)
    .eq('id', params.id)
    .single()

  if (runError) {
    if (runError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }
    return NextResponse.json({ error: runError.message }, { status: 500 })
  }

  // Check access
  if (run.job?.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('id')
      .eq('workspace_id', run.job.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Get associated ledger events
  const { data: ledgerEvents } = await supabase
    .from('ledger_events')
    .select('*')
    .eq('automation_run_id', params.id)
    .order('timestamp', { ascending: true })

  // Get associated email deliveries
  const { data: emailDeliveries } = await supabase
    .from('email_deliveries')
    .select('*')
    .eq('automation_run_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    data: {
      ...run,
      ledger_events: ledgerEvents || [],
      email_deliveries: emailDeliveries || [],
    },
  })
}

// PATCH /api/automation/runs/[id] — update automation run
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const allowed = [
    'status',
    'started_at',
    'ended_at',
    'duration_ms',
    'logs',
    'output',
    'error',
    'trace',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // Check access through job
  const { data: run } = await supabase
    .from('automation_runs')
    .select('job:automation_jobs(workspace_id)')
    .eq('id', params.id)
    .single()

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // @ts-expect-error - Supabase relation type
  const workspaceId = run.job?.workspace_id
  if (workspaceId) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { data, error: dbError } = await supabase
    .from('automation_runs')
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Update job status if run completed/failed
  if (body.status === 'completed' || body.status === 'failed') {
    const { data: runData } = await supabase
      .from('automation_runs')
      .select('job_id')
      .eq('id', params.id)
      .single()

    if (runData) {
      await supabase
        .from('automation_jobs')
        .update({
          last_status: body.status,
          last_run_at: body.ended_at || new Date().toISOString(),
        })
        .eq('id', runData.job_id)
    }
  }

  return NextResponse.json({ data })
}
