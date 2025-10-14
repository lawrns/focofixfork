import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetTasksSchema, CreateTaskSchema } from '@/lib/validation/schemas/task-api.schema'
import { TasksService } from '@/features/tasks/services/taskService'

/**
 * GET /api/tasks - List tasks for the authenticated user
 */
export async function GET(request: NextRequest) {
  return wrapRoute(GetTasksSchema, async ({ input, user, correlationId }) => {
    const projectId = input.query?.project_id
    const milestoneId = input.query?.milestone_id
    const status = input.query?.status
    const priority = input.query?.priority
    const assigneeId = input.query?.assignee_id
    const limit = input.query?.limit || 10
    const offset = input.query?.offset || 0

    const result = await TasksService.getUserTasks(user.id, {
      project_id: projectId,
      milestone_id: milestoneId,
      status,
      priority,
      assignee_id: assigneeId,
      limit,
      offset,
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to fetch tasks')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return {
      data: result.data,
      pagination: result.pagination,
    }
  })(request)
}

/**
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
  return wrapRoute(CreateTaskSchema, async ({ input, user, correlationId }) => {
    const result = await TasksService.createTask(user.id, input.body as any)

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to create task')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}


