import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// GET /api/automation/jobs/[id]/runs — list runs for an automation job
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Check access to job
  const { data: job } = await supabase
    .from('automation_jobs')
    .select('workspace_id')
    .eq('id', params.id)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('id')
      .eq('workspace_id', job.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  let query = supabase
    .from('automation_runs')
    .select('*')
    .eq('job_id', params.id)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error: dbError, count } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

// POST /api/automation/jobs/[id]/runs — create a new run for this job
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()

  // Check access to job
  const { data: job } = await supabase
    .from('automation_jobs')
    .select('workspace_id, handler, payload')
    .eq('id', params.id)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', job.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { data, error: dbError } = await supabase
    .from('automation_runs')
    .insert({
      job_id: params.id,
      status: body.status || 'pending',
      trigger_type: body.trigger_type || 'manual',
      started_at: body.started_at || new Date().toISOString(),
      logs: body.logs || [],
      output: body.output || {},
      trace: {
        ...body.trace,
        triggered_by: user.id,
        handler: job.handler,
      },
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Update job last_status
  await supabase
    .from('automation_jobs')
    .update({
      last_status: body.status || 'pending',
      last_run_at: body.started_at || new Date().toISOString(),
    })
    .eq('id', params.id)

  return NextResponse.json({ data }, { status: 201 })
}
