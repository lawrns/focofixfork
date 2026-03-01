import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

// GET /api/emails/deliveries/[id] — get single email delivery with ledger events
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('email_deliveries')
    .select(`
      *,
      project:foco_projects(id, name, slug, color),
      workspace:foco_workspaces(id, name, slug),
      automation_run:automation_runs(id, status, job_id, job:automation_jobs(id, name)),
      task:work_items(id, title, type)
    `)
    .eq('id', params.id)
    .single()

  if (dbError) {
    if (dbError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Check access
  if (data.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('id')
      .eq('workspace_id', data.workspace_id)
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
    .eq('email_delivery_id', params.id)
    .order('timestamp', { ascending: true })

  return NextResponse.json({
    data: {
      ...data,
      ledger_events: ledgerEvents || [],
    },
  })
}

// PATCH /api/emails/deliveries/[id] — update email delivery status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const allowed = [
    'status',
    'provider',
    'provider_message_id',
    'retry_count',
    'sent_at',
    'delivered_at',
    'failed_at',
    'error',
    'error_code',
    'metadata',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // Check access
  const { data: existing } = await supabase
    .from('email_deliveries')
    .select('workspace_id')
    .eq('id', params.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
  }

  if (existing.workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', existing.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { data, error: dbError } = await supabase
    .from('email_deliveries')
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}
