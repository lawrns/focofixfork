import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { SettingsRepository } from '@/lib/repositories/settings-repository'
import type { UserSettings } from '@/lib/repositories/settings-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(request)
    authResponse = response;

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await request.json()
    const { workspaceName, workspaceSlug, workspaceDescription, aiPolicy, notifications } = body

    const repo = new SettingsRepository(supabase)

    // Build update object with only provided fields
    const updates: Partial<UserSettings> = {}

    if (workspaceName !== undefined) {
      updates.workspaceName = workspaceName
    }
    if (workspaceSlug !== undefined) {
      updates.workspaceSlug = workspaceSlug
    }
    if (workspaceDescription !== undefined) {
      updates.workspaceDescription = workspaceDescription
    }
    if (aiPolicy !== undefined) {
      updates.aiPolicy = aiPolicy
    }
    if (notifications !== undefined) {
      updates.notifications = notifications
    }

    const result = await repo.updateSettings(user.id, updates)

    if (isError(result)) {
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    return mergeAuthResponse(successResponse({ success: true, settings: result.data }), authResponse)
  } catch (error) {
    console.error('Error in settings API:', error)
    return mergeAuthResponse(databaseErrorResponse('Failed to update settings', error), authResponse)
  }
}
