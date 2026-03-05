import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// GET /api/emails/deliveries — list email deliveries
export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  const projectId = searchParams.get('project_id')
  const taskId = searchParams.get('task_id')
  const status = searchParams.get('status')
  const automationRunId = searchParams.get('automation_run_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get user's workspace access
  const { data: memberships } = await supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)

  const accessibleWorkspaceIds = memberships?.map((m) => m.workspace_id) || []

  let query = supabase
    .from('email_deliveries')
    .select(`
      *,
      project:foco_projects(id, name, slug, color),
      workspace:foco_workspaces(id, name, slug),
      automation_run:automation_runs(id, status, job_id),
      task:work_items(id, title, type)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else if (accessibleWorkspaceIds.length > 0) {
    // Filter by accessible workspaces
    query = query.or(
      `workspace_id.in.(${accessibleWorkspaceIds.join(',')}),workspace_id.is.null`
    )
  } else {
    // No workspace access, return empty
    return NextResponse.json({ data: [] })
  }

  if (projectId) query = query.eq('project_id', projectId)
  if (taskId) query = query.eq('task_id', taskId)
  if (status) query = query.eq('status', status)
  if (automationRunId) query = query.eq('automation_run_id', automationRunId)

  const { data, error: dbError } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}

// POST /api/emails/deliveries — create email delivery
export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const {
    to,
    cc,
    bcc,
    subject,
    body_md,
    body_html,
    automation_run_id,
    task_id,
    project_id,
    workspace_id,
    metadata,
  } = body

  if (!to || !subject || !body_md) {
    return NextResponse.json(
      { error: 'to, subject, and body_md are required' },
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
    .from('email_deliveries')
    .insert({
      to: Array.isArray(to) ? to : [to],
      cc: cc || [],
      bcc: bcc || [],
      subject,
      body_md,
      body_html: body_html || null,
      automation_run_id: automation_run_id || null,
      task_id: task_id || null,
      project_id: project_id || null,
      workspace_id: workspace_id || null,
      metadata: metadata || {},
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
