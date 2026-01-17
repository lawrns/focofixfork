import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { TaskRepository } from '@/lib/repositories/task-repository'
import { isError } from '@/lib/repositories/base-repository'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  taskNotFoundResponse,
  internalErrorResponse,
  databaseErrorResponse,
  forbiddenResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params

    // Use admin client to bypass RLS, then verify access manually
    // This is more reliable than depending on RLS with server-side auth
    const { data: task, error: taskError } = await supabaseAdmin
      .from('work_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (taskError) {
      console.error('Task fetch error:', taskError)
      return databaseErrorResponse('Failed to fetch task', taskError)
    }

    if (!task) {
      return taskNotFoundResponse(id)
    }

    // Verify user has access to this task's workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
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

    const successRes = successResponse({
      ...task,
      project,
      assignee,
      reporter,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (err: any) {
    console.error('Task GET error:', err)
    return internalErrorResponse('Failed to fetch task', err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const body = await req.json()

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
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this task')
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
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

    return mergeAuthResponse(successResponse(updated), authResponse)
  } catch (err: any) {
    console.error('Task PATCH error:', err)
    return internalErrorResponse('Failed to update task', err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params

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
      .from('workspace_members')
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
  } catch (err: any) {
    console.error('Task DELETE error:', err)
    return internalErrorResponse('Failed to delete task', err)
  }
}
