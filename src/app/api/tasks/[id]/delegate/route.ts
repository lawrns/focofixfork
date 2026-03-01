import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  authRequiredResponse,
  taskNotFoundResponse,
  forbiddenResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params

    // Fetch the task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('work_items')
      .select('id, workspace_id, delegation_status')
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

    // Queue for delegation by setting status to 'pending'
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('work_items')
      .update({ delegation_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return databaseErrorResponse('Failed to queue task for delegation', updateError)
    }

    return mergeAuthResponse(successResponse(updated), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delegate task', message)
  }
}
