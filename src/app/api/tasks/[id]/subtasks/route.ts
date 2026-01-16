import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';import { generateFractionalIndex } from '@/lib/utils/fractional-indexing'
import { SubtaskRepository } from '@/lib/repositories/subtask-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id } = await params

    const repo = new SubtaskRepository(supabase)
    const result = await repo.findByTaskId(id)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
  } catch (err: any) {
    console.error('Get subtasks error:', err)
    return databaseErrorResponse('Failed to fetch subtasks', err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id } = await params
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
    const lastResult = await repo.getLastSubtask(id)

    if (isError(lastResult)) {
      return databaseErrorResponse(lastResult.error.message, lastResult.error.details)
    }

    const lastPosition = lastResult.data?.position || 'a0'
    const newPosition = generateFractionalIndex(lastPosition, null)

    // Create new subtask
    const result = await repo.createSubtask({
      task_id: id,
      title: title.trim(),
      completed: false,
      position: newPosition,
    })

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data, undefined, 201)
  } catch (err: any) {
    console.error('Create subtask error:', err)
    return databaseErrorResponse('Failed to create subtask', err)
  }
}
