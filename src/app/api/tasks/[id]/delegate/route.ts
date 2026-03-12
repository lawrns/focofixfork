import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  successResponse,
  taskNotFoundResponse,
  databaseErrorResponse,
  badRequestResponse,
} from '@/lib/api/response-helpers'
import { accessFailureResponse, requireTaskAccess } from '@/server/auth/access'
import { queueProjectTasksForDelegation } from '@/lib/delegation/queue'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireTaskAccess({ taskId: id })
    if (!access.ok) return accessFailureResponse(access)

    // Fetch the task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('work_items')
      .select('id, workspace_id, project_id, delegation_status')
      .eq('id', id)
      .maybeSingle()

    if (taskError) {
      return databaseErrorResponse('Failed to fetch task', taskError)
    }

    if (!task) {
      return taskNotFoundResponse(id)
    }

    if (typeof task.project_id !== 'string' || task.project_id.length === 0) {
      return badRequestResponse('Only project tasks can be queued for AI delegation')
    }

    await queueProjectTasksForDelegation({
      projectId: task.project_id,
      taskIds: [id],
      actorId: access.user.id,
    })

    const { data: updated } = await supabaseAdmin
      .from('work_items')
      .select('*')
      .eq('id', id)
      .single()

    return successResponse(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delegate task', message)
  }
}
