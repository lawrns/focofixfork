import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, databaseErrorResponse, successResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/workspace
 * Gets the primary workspace for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const repo = new WorkspaceRepository(supabase)
    const result = await repo.findByUser(user.id)

    if (isError(result)) {
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    // Return the first workspace as the "primary" one for now
    // In a more complex system, this might be stored in user preferences
    const primaryWorkspace = result.data[0]

    if (!primaryWorkspace) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'No workspace found for user' },
        { status: 404 }
      ), authResponse)
    }

    return mergeAuthResponse(successResponse({
      workspace_id: primaryWorkspace.id,
      workspace: primaryWorkspace
    }), authResponse)
  } catch (err: any) {
    console.error('User workspace API error:', err)
    return databaseErrorResponse('Failed to fetch user workspace', err)
  }
}
