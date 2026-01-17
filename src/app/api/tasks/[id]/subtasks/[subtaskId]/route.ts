import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { SubtaskRepository } from '@/lib/repositories/subtask-repository'
import type { UpdateSubtaskData } from '@/lib/repositories/subtask-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse, validationFailedResponse, notFoundResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId, subtaskId } = params
    const body = await req.json()

    // Build update object with only provided fields
    const updateData: UpdateSubtaskData = {}

    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return validationFailedResponse('Title must be a string')
      }
      if (body.title.trim().length === 0) {
        return validationFailedResponse('Title cannot be empty')
      }
      if (body.title.length > 500) {
        return validationFailedResponse('Title must be 500 characters or less')
      }
      updateData.title = body.title.trim()
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== 'boolean') {
        return validationFailedResponse('Completed must be a boolean')
      }
      updateData.completed = body.completed
    }

    if (body.position !== undefined) {
      if (typeof body.position !== 'string') {
        return validationFailedResponse('Position must be a string')
      }
      updateData.position = body.position
    }

    if (Object.keys(updateData).length === 0) {
      return validationFailedResponse('No fields to update')
    }

    const repo = new SubtaskRepository(supabase)
    const result = await repo.updateSubtask(subtaskId, taskId, updateData)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        const errorRes = notFoundResponse('Subtask', subtaskId)
        return mergeAuthResponse(errorRes, authResponse)
      }
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: any) {
    console.error('PATCH subtask error:', err)
    return databaseErrorResponse('Failed to update subtask', err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId, subtaskId } = params

    const repo = new SubtaskRepository(supabase)
    const result = await repo.deleteSubtask(subtaskId, taskId)

    if (isError(result)) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse({ message: 'Subtask deleted' }), authResponse)
  } catch (err: any) {
    console.error('DELETE subtask error:', err)
    return databaseErrorResponse('Failed to delete subtask', err)
  }
}
