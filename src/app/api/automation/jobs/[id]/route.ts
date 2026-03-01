import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// GET /api/automation/jobs/[id] — get single automation job
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('automation_jobs')
    .select(`
      *,
      project:foco_projects(id, name, slug, color),
      workspace:foco_workspaces(id, name, slug)
    `)
    .eq('id', params.id)
    .single()

  if (dbError) {
    if (dbError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/automation/jobs/[id] — update automation job
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const allowed = [
    'name',
    'description',
    'job_type',
    'schedule',
    'enabled',
    'handler',
    'payload',
    'policy',
    'project_id',
    'workspace_id',
    'last_run_at',
    'last_status',
    'next_run_at',
    'metadata',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // Check access
  const { data: existingJob } = await supabase
    .from('automation_jobs')
    .select('workspace_id')
    .eq('id', params.id)
    .single()

  if (!existingJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (existingJob.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', existingJob.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { data, error: dbError } = await supabase
    .from('automation_jobs')
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select(`
      *,
      project:foco_projects(id, name, slug, color),
      workspace:foco_workspaces(id, name, slug)
    `)
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}

// DELETE /api/automation/jobs/[id] — delete automation job
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  // Check access
  const { data: existingJob } = await supabase
    .from('automation_jobs')
    .select('workspace_id')
    .eq('id', params.id)
    .single()

  if (!existingJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (existingJob.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', existingJob.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { error: dbError } = await supabase
    .from('automation_jobs')
    .delete()
    .eq('id', params.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
