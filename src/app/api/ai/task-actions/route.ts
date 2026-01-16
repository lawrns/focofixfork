/**
 * AI Task Actions API
 * POST /api/ai/task-actions - Generate AI preview for task action
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TaskActionService, type TaskActionType } from '@/lib/services/task-action-service'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  forbiddenResponse,
  validationFailedResponse,
  isValidUUID,
  invalidUUIDResponse
} from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

// Valid action types
const VALID_ACTIONS: TaskActionType[] = [
  'suggest_subtasks',
  'draft_acceptance',
  'summarize_thread',
  'propose_next_step',
  'detect_blockers',
  'break_into_subtasks',
  'draft_update',
  'estimate_time',
  'find_similar'
]

// Request validation schema
const TaskActionRequestSchema = z.object({
  action: z.enum(VALID_ACTIONS as [TaskActionType, ...TaskActionType[]]),
  task_id: z.string().uuid(),
  workspace_id: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = TaskActionRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid request', parseResult.error.flatten()),
        authResponse
      )
    }

    const { action, task_id, workspace_id } = parseResult.data

    // Validate UUIDs
    if (!isValidUUID(task_id)) {
      return mergeAuthResponse(invalidUUIDResponse('task_id', task_id), authResponse)
    }
    if (!isValidUUID(workspace_id)) {
      return mergeAuthResponse(invalidUUIDResponse('workspace_id', workspace_id), authResponse)
    }

    // Check workspace access
    const workspaceRepo = new WorkspaceRepository(supabase)
    const isMemberResult = await workspaceRepo.isMember(workspace_id, user.id)

    if (isError(isMemberResult)) {
      return mergeAuthResponse(databaseErrorResponse(isMemberResult.error.message), authResponse)
    }

    if (!isMemberResult.data) {
      return mergeAuthResponse(
        forbiddenResponse('You do not have access to this workspace'),
        authResponse
      )
    }

    // Get workspace policy
    const workspaceResult = await workspaceRepo.findById(workspace_id)
    if (isError(workspaceResult)) {
      return mergeAuthResponse(databaseErrorResponse(workspaceResult.error.message), authResponse)
    }

    const policy = workspaceResult.data.ai_policy || {}

    // Generate preview using TaskActionService
    const taskActionService = new TaskActionService(supabase)
    const preview = await taskActionService.generatePreview(
      { action, task_id, workspace_id },
      policy,
      user.id
    )

    return mergeAuthResponse(
      successResponse({
        success: true,
        ...preview
      }),
      authResponse
    )

  } catch (error) {
    console.error('Task action error:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key not configured')) {
        return NextResponse.json(
          { success: false, error: 'AI service not configured', code: 'AI_NOT_CONFIGURED' },
          { status: 503 }
        )
      }
      if (error.message.includes('Task not found')) {
        return NextResponse.json(
          { success: false, error: 'Task not found', code: 'TASK_NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate AI preview', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
