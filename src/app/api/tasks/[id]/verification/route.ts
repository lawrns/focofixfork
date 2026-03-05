import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createTaskExecutionEvent } from '@/features/task-intake'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { data: task } = await supabaseAdmin
    .from('work_items')
    .select('id, workspace_id')
    .eq('id', id)
    .maybeSingle()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const { data: membership } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('id')
    .eq('workspace_id', task.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error: verificationError } = await supabaseAdmin
    .from('task_verifications')
    .select('*')
    .eq('work_item_id', id)
    .order('created_at', { ascending: false })

  if (verificationError) {
    return NextResponse.json({ error: verificationError.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { verification_type, status, command, summary, details } = body as {
    verification_type?: string
    status?: string
    command?: string
    summary?: string
    details?: Record<string, unknown>
  }

  if (!verification_type || !status || !summary?.trim()) {
    return NextResponse.json({ error: 'verification_type, status, and summary are required' }, { status: 400 })
  }

  const { data: task } = await supabaseAdmin
    .from('work_items')
    .select('id, workspace_id, project_id, metadata')
    .eq('id', id)
    .maybeSingle()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const { data: membership } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('id')
    .eq('workspace_id', task.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error: insertError } = await supabaseAdmin
    .from('task_verifications')
    .insert({
      work_item_id: id,
      workspace_id: task.workspace_id,
      project_id: task.project_id,
      verification_type,
      status,
      command: command || null,
      summary: summary.trim(),
      details: details ?? {},
      verified_by: user.id,
    })
    .select()
    .single()

  if (insertError || !data) {
    return NextResponse.json({ error: insertError?.message || 'Failed to create verification' }, { status: 500 })
  }

  const existingMetadata = typeof task.metadata === 'object' && task.metadata !== null ? task.metadata as Record<string, unknown> : {}
  await supabaseAdmin
    .from('work_items')
    .update({
      metadata: {
        ...existingMetadata,
        verification_summary: {
          required: existingMetadata?.verification_summary && typeof existingMetadata.verification_summary === 'object'
            ? (existingMetadata.verification_summary as Record<string, unknown>).required ?? false
            : false,
          latest_status: status,
          latest_summary: summary.trim(),
          latest_verified_at: data.created_at,
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  await createTaskExecutionEvent({
    workItemId: id,
    workspaceId: task.workspace_id,
    projectId: task.project_id,
    actorType: 'user',
    actorId: user.id,
    eventType: 'verification_recorded',
    summary: `Verification recorded: ${summary.trim()}`,
    details: {
      verification_type,
      status,
      command: command || null,
    },
  })

  return NextResponse.json({ data }, { status: 201 })
}
