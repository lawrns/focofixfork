import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetTaskSchema, UpdateTaskSchema, PatchTaskSchema, DeleteTaskSchema } from '@/lib/validation/schemas/task-api.schema'
import { TasksService } from '@/features/tasks/services/taskService'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/tasks/[id] - Get a specific task
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetTaskSchema, async ({ user, correlationId }) => {
    const taskId = context.params.id

    if (!taskId) {
      const err: any = new Error('Task ID is required')
      err.code = 'INVALID_TASK_ID'
      err.statusCode = 400
      throw err
    }

    const result = await TasksService.getTaskById(user.id, taskId)

    if (!result.success) {
      // When RLS is enabled, "not found" usually means no permission (403), not truly missing (404)
      // Return 403 for authenticated users trying to access resources they don't own
      const statusCode = result.error === 'Task not found' ? 403 : 500
      const err: any = new Error(
        result.error === 'Task not found'
          ? 'You do not have permission to access this task'
          : result.error || 'Failed to fetch task'
      )
      err.code = statusCode === 403 ? 'TASK_FORBIDDEN' : 'DATABASE_ERROR'
      err.statusCode = statusCode
      throw err
    }

    return result.data
  })(request)
}

/**
 * PUT /api/tasks/[id] - Update a specific task
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return wrapRoute(UpdateTaskSchema, async ({ input, user, correlationId }) => {
    const taskId = context.params.id

    if (!taskId) {
      const err: any = new Error('Task ID is required')
      err.code = 'INVALID_TASK_ID'
      err.statusCode = 400
      throw err
    }

    const result = await TasksService.updateTask(user.id, taskId, input.body)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 403 : 500
      const err: any = new Error(
        result.error === 'Task not found'
          ? 'You do not have permission to update this task'
          : result.error || 'Failed to update task'
      )
      err.code = statusCode === 403 ? 'TASK_FORBIDDEN' : 'DATABASE_ERROR'
      err.statusCode = statusCode
      throw err
    }

    return result.data
  })(request)
}

/**
 * PATCH /api/tasks/[id] - Update task (partial update)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  return wrapRoute(PatchTaskSchema, async ({ input, user, correlationId }) => {
    const taskId = context.params.id

    if (!taskId) {
      const err: any = new Error('Task ID is required')
      err.code = 'INVALID_TASK_ID'
      err.statusCode = 400
      throw err
    }

    // Check if this is a status-only update
    const url = new URL(request.url)
    const isStatusUpdate = url.pathname.endsWith('/status')

    if (isStatusUpdate && input.body.status) {
      const result = await TasksService.updateTaskStatus(user.id, taskId, input.body.status)

      if (!result.success) {
        const statusCode = result.error === 'Task not found' ? 403 : 500
        const err: any = new Error(
          result.error === 'Task not found'
            ? 'You do not have permission to update this task'
            : result.error || 'Failed to update task status'
        )
        err.code = statusCode === 403 ? 'TASK_FORBIDDEN' : 'DATABASE_ERROR'
        err.statusCode = statusCode
        throw err
      }

      return result.data
    }

    // Regular PATCH for other updates
    const result = await TasksService.updateTask(user.id, taskId, input.body)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 403 : 500
      const err: any = new Error(
        result.error === 'Task not found'
          ? 'You do not have permission to update this task'
          : result.error || 'Failed to update task'
      )
      err.code = statusCode === 403 ? 'TASK_FORBIDDEN' : 'DATABASE_ERROR'
      err.statusCode = statusCode
      throw err
    }

    return result.data
  })(request)
}

/**
 * DELETE /api/tasks/[id] - Delete a specific task
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return wrapRoute(DeleteTaskSchema, async ({ user, correlationId }) => {
    const taskId = context.params.id

    if (!taskId) {
      const err: any = new Error('Task ID is required')
      err.code = 'INVALID_TASK_ID'
      err.statusCode = 400
      throw err
    }

    const result = await TasksService.deleteTask(user.id, taskId)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 403 : 500
      const err: any = new Error(
        result.error === 'Task not found'
          ? 'You do not have permission to delete this task'
          : result.error || 'Failed to delete task'
      )
      err.code = statusCode === 403 ? 'TASK_FORBIDDEN' : 'DATABASE_ERROR'
      err.statusCode = statusCode
      throw err
    }

    return { message: 'Task deleted successfully' }
  })(request)
}


