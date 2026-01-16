/**
 * AI Task Actions Apply API
 * POST /api/ai/task-actions/[id]/apply - Apply a previously generated preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { TaskActionService } from '@/lib/services/task-action-service'
import {
  authRequiredResponse,
  successResponse,
  isValidUUID,
  invalidUUIDResponse
} from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params

    // Validate UUID
    if (!isValidUUID(executionId)) {
      return invalidUUIDResponse('execution_id', executionId)
    }

    // Get authenticated user
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    // Apply the preview
    const taskActionService = new TaskActionService(supabase)
    const result = await taskActionService.applyPreview(executionId, user.id)

    return mergeAuthResponse(successResponse(result), authResponse)

  } catch (error) {
    console.error('Apply task action error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found or expired')) {
        return NextResponse.json(
          { success: false, error: 'Preview not found or expired', code: 'PREVIEW_EXPIRED' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to apply changes', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
