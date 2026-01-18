import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { TaskRepository } from '@/lib/repositories/task-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  validationFailedResponse,
  forbiddenResponse,
  databaseErrorResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

type BatchOperation = 'complete' | 'move' | 'priority' | 'assign' | 'tag' | 'delete'

interface BatchOperationRequest {
  taskIds: string[]
  operation: BatchOperation
  value?: string | string[] | null
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body: BatchOperationRequest = await req.json()

    // Validate request
    if (!body.taskIds || !Array.isArray(body.taskIds) || body.taskIds.length === 0) {
      return validationFailedResponse('taskIds must be a non-empty array')
    }

    if (!body.operation || !['complete', 'move', 'priority', 'assign', 'tag', 'delete'].includes(body.operation)) {
      return validationFailedResponse('Invalid operation type')
    }

    const repo = new TaskRepository(supabase)

    // Verify user has access to all tasks
    const accessResult = await repo.verifyUserAccess(body.taskIds, user.id)
    if (isError(accessResult)) {
      if (accessResult.error.code === 'NOT_FOUND') {
        return validationFailedResponse('No tasks found', { taskIds: body.taskIds })
      }
      return databaseErrorResponse(accessResult.error.message, accessResult.error.details)
    }

    if (!accessResult.data) {
      return forbiddenResponse('You do not have access to all selected tasks')
    }

    // Prepare update data based on operation
    let updateData: Record<string, string | string[] | null> = {}
    let isDelete = false

    switch (body.operation) {
      case 'complete':
        updateData = { status: 'done' }
        break
      case 'move':
        if (!body.value) {
          return validationFailedResponse('value (project_id) is required for move operation')
        }
        updateData = { project_id: body.value }
        break
      case 'priority':
        if (!body.value || !['low', 'medium', 'high', 'urgent', 'none'].includes(body.value)) {
          return validationFailedResponse('value must be a valid priority level')
        }
        updateData = { priority: body.value }
        break
      case 'assign':
        updateData = { assignee_id: body.value || null }
        break
      case 'tag':
        if (!body.value || !Array.isArray(body.value)) {
          return validationFailedResponse('value must be an array of tags')
        }
        updateData = { tags: body.value }
        break
      case 'delete':
        isDelete = true
        break
    }

    // Perform batch operation
    if (isDelete) {
      const deleteResult = await repo.batchDelete(body.taskIds)
      if (isError(deleteResult)) {
        return databaseErrorResponse(deleteResult.error.message, deleteResult.error.details)
      }

      return mergeAuthResponse(successResponse({
        operation: body.operation,
        updated: deleteResult.data,
        failed: 0,
      }), authResponse)
    } else {
      const updateResult = await repo.batchUpdate(body.taskIds, updateData)
      if (isError(updateResult)) {
        return databaseErrorResponse(updateResult.error.message, updateResult.error.details)
      }

      const updatedCount = updateResult.data.length
      const failedCount = body.taskIds.length - updatedCount

      return mergeAuthResponse(successResponse({
        operation: body.operation,
        updated: updatedCount,
        failed: failedCount,
        tasks: updateResult.data,
      }), authResponse)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return internalErrorResponse('Failed to perform batch operation', message)
  }
}
