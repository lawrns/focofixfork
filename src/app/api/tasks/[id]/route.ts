import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { TaskRepository } from '@/lib/repositories/task-repository'
import { isError } from '@/lib/repositories/base-repository'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createTaskExecutionEvent } from '@/features/task-intake'
import {
  successResponse,
  authRequiredResponse,
  taskNotFoundResponse,
  internalErrorResponse,
  databaseErrorResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params

    // Use admin client to bypass RLS, then verify access manually
    // This is more reliable than depending on RLS with server-side auth
    const { data: task, error: taskError } = await supabaseAdmin
      .from('work_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (taskError) {
      return databaseErrorResponse('Failed to fetch task', taskError)
    }

    if (!task) {
      return taskNotFoundResponse(id)
    }

    // Verify user has access to this task's workspace
    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this task')
    }

    // Fetch related data (project, assignee)
    const { data: project } = await supabaseAdmin
      .from('foco_projects')
      .select('id, name, slug, color')
      .eq('id', task.project_id)
      .maybeSingle()

    // Fetch assignee profile if exists
    let assignee = null
    if (task.assignee_id) {
      const { data: assigneeProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('id', task.assignee_id)
        .maybeSingle()
      assignee = assigneeProfile
    }

    // Fetch reporter profile if exists
    let reporter = null
    if (task.reporter_id) {
      const { data: reporterProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('id', task.reporter_id)
        .maybeSingle()
      reporter = reporterProfile
    }

    const { data: executionEvents } = await supabaseAdmin
      .from('task_execution_events')
      .select('id, actor_type, actor_id, event_type, summary, details, created_at')
      .eq('work_item_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: verifications } = await supabaseAdmin
      .from('task_verifications')
      .select('id, verification_type, status, command, summary, details, created_at')
      .eq('work_item_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const metadata = typeof task.metadata === 'object' && task.metadata !== null
      ? task.metadata as Record<string, unknown>
      : {}

    const verificationSummary = metadata.verification_summary as Record<string, unknown> | undefined
    const executionState = metadata.execution_state as Record<string, unknown> | undefined

    const successRes = successResponse({
      ...task,
      project,
      assignee,
      reporter,
      execution_events: executionEvents ?? [],
      verifications: verifications ?? [],
      orchestration_summary: {
        source: typeof metadata.source === 'string' ? metadata.source : null,
        recommended_execution: typeof metadata.recommended_execution === 'string' ? metadata.recommended_execution : null,
        recommended_agent: typeof metadata.recommended_agent === 'string' ? metadata.recommended_agent : null,
        latest_execution_summary: typeof executionState?.summary === 'string' ? executionState.summary : null,
        verification_required: Boolean(verificationSummary?.required),
        latest_verification_status: typeof verificationSummary?.latest_status === 'string' ? verificationSummary.latest_status : null,
        latest_verification_summary: typeof verificationSummary?.latest_summary === 'string' ? verificationSummary.latest_summary : null,
      },
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to fetch task', message)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params
    const body = await req.json()

    // Verify task exists and user has access
    const { data: task } = await supabaseAdmin
      .from('work_items')
      .select('id, workspace_id, project_id, status, metadata')
      .eq('id', id)
      .maybeSingle()

    if (!task) {
      return taskNotFoundResponse(id)
    }

    // Verify user has access to this task's workspace
    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this task')
    }

    const { data: project } = await supabaseAdmin
      .from('foco_projects')
      .select('delegation_settings')
      .eq('id', task.project_id)
      .maybeSingle()

    const delegationSettings = ((project?.delegation_settings ?? {}) as Record<string, unknown>)
    const verificationRequired = delegationSettings.verification_required_before_done === true

    if (body.status === 'done' && verificationRequired) {
      const metadata = typeof task.metadata === 'object' && task.metadata !== null
        ? task.metadata as Record<string, unknown>
        : {}
      const verificationSummary = metadata.verification_summary as Record<string, unknown> | undefined
      const latestVerificationStatus = verificationSummary?.latest_status

      if (latestVerificationStatus !== 'passed') {
        return mergeAuthResponse(
          badRequestResponse('A passing verification record is required before this task can move to done'),
          authResponse
        )
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.position !== undefined) updateData.position = body.position
    if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.project_id !== undefined) updateData.project_id = body.project_id
    if (body.estimate_hours !== undefined) updateData.estimate_hours = body.estimate_hours
    if (body.delegation_status !== undefined) updateData.delegation_status = body.delegation_status
    if (body.assigned_agent !== undefined) updateData.assigned_agent = body.assigned_agent
    if (body.run_id !== undefined) updateData.run_id = body.run_id
    if (body.approval_required !== undefined) updateData.approval_required = body.approval_required
    if (body.approved_by !== undefined) updateData.approved_by = body.approved_by
    if (body.handbook_ref !== undefined) updateData.handbook_ref = body.handbook_ref

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('work_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      const errorRes = databaseErrorResponse('Failed to update task', updateError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (body.status && body.status !== task.status) {
      await createTaskExecutionEvent({
        workItemId: id,
        workspaceId: task.workspace_id,
        projectId: task.project_id,
        actorType: 'user',
        actorId: user.id,
        eventType: 'status_changed',
        summary: `Task moved from ${task.status} to ${body.status}.`,
        details: {
          from: task.status,
          to: body.status,
        },
      })
    }

    return mergeAuthResponse(successResponse(updated), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to update task', message)
  }
}

// PUT is an alias for PATCH for compatibility with clients
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params

    // Verify task exists and user has access
    const { data: task } = await supabaseAdmin
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', id)
      .maybeSingle()

    if (!task) {
      return taskNotFoundResponse(id)
    }

    // Verify user has access to this task's workspace
    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('id, role')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this task')
    }

    // Only admins and owners can delete tasks
    if (!['owner', 'admin'].includes(membership.role)) {
      return forbiddenResponse('Only admins can delete tasks')
    }

    const { error: deleteError } = await supabaseAdmin
      .from('work_items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      const errorRes = databaseErrorResponse('Failed to delete task', deleteError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse({ deleted: true }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to delete task', message)
  }
}
