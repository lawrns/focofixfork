import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { TaskRepository } from '@/lib/repositories/task-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  successResponse,
  authRequiredResponse,
  taskNotFoundResponse,
  internalErrorResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'

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
    const taskRepo = new TaskRepository(supabase)
    const result = await taskRepo.findById(id)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return taskNotFoundResponse(id)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
  } catch (err: any) {
    console.error('Task GET error:', err)
    return internalErrorResponse('Failed to fetch task', err)
  }
}

export async function PATCH(
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

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.position !== undefined) updateData.position = body.position
    if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id
    if (body.milestone_id !== undefined) updateData.milestone_id = body.milestone_id
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.project_id !== undefined) updateData.project_id = body.project_id

    const taskRepo = new TaskRepository(supabase)
    const result = await taskRepo.updateTask(id, updateData)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return taskNotFoundResponse(id)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
  } catch (err: any) {
    console.error('Task PATCH error:', err)
    return internalErrorResponse('Failed to update task', err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id } = await params
    const taskRepo = new TaskRepository(supabase)
    const result = await taskRepo.delete(id)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse({ deleted: true })
  } catch (err: any) {
    console.error('Task DELETE error:', err)
    return internalErrorResponse('Failed to delete task', err)
  }
}
