import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { generateFractionalIndex } from '@/lib/utils/fractional-indexing'
import { SubtaskRepository } from '@/lib/repositories/subtask-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId } = params

    const repo = new SubtaskRepository(supabase)
    const result = await repo.findByTaskId(taskId)

    if (isError(result)) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch subtasks', message)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId } = params
    const body = await req.json()
    const { title } = body

    // Validation
    if (!title || typeof title !== 'string') {
      return databaseErrorResponse('Title is required and must be a string')
    }

    if (title.trim().length === 0) {
      return databaseErrorResponse('Title cannot be empty')
    }

    if (title.length > 500) {
      return databaseErrorResponse('Title must be 500 characters or less')
    }

    const repo = new SubtaskRepository(supabase)

    // Get the last subtask to determine position
    const lastResult = await repo.getLastSubtask(taskId)

    if (isError(lastResult)) {
      return databaseErrorResponse(lastResult.error.message, lastResult.error.details)
    }

    const lastPosition = lastResult.data?.position || 'a0'
    const newPosition = generateFractionalIndex(lastPosition, null)

    // Create new subtask
    const result = await repo.createSubtask({
      task_id: taskId,
      title: title.trim(),
      completed: false,
      position: newPosition,
    })

    if (isError(result)) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data, undefined, 201), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to create subtask', message)
  }
}
