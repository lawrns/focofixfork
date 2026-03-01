import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// GET /api/automation/jobs — list automation jobs
export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')
  const enabled = searchParams.get('enabled')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('automation_jobs')
    .select(`
      *,
      project:foco_projects(id, name, slug, color),
      workspace:foco_workspaces(id, name, slug)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  if (projectId) query = query.eq('project_id', projectId)
  if (status) query = query.eq('last_status', status)
  if (enabled !== null) query = query.eq('enabled', enabled === 'true')

  const { data, error: dbError, count } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

// POST /api/automation/jobs — create automation job
export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const {
    name,
    description,
    job_type,
    schedule,
    enabled,
    handler,
    payload,
    policy,
    project_id,
    workspace_id,
    external_id,
  } = body

  if (!name || !handler) {
    return NextResponse.json(
      { error: 'name and handler are required' },
      { status: 400 }
    )
  }

  // Verify workspace access
  if (workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      )
    }
  }

  const { data, error: dbError } = await supabase
    .from('automation_jobs')
    .insert({
      name,
      description: description || null,
      job_type: job_type || 'cron',
      schedule: schedule || null,
      enabled: enabled ?? true,
      handler,
      payload: payload || {},
      policy: policy || {},
      project_id: project_id || null,
      workspace_id: workspace_id || null,
      external_id: external_id || null,
    })
    .select(`
      *,
      project:foco_projects(id, name, slug, color),
      workspace:foco_workspaces(id, name, slug)
    `)
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
