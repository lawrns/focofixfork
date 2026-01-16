import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { SettingsRepository } from '@/lib/repositories/settings-repository'
import type { UserSettings } from '@/lib/repositories/settings-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
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
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse({ success: true, settings: result.data })
  } catch (error) {
    console.error('Error in settings API:', error)
    return databaseErrorResponse('Failed to update settings', error)
  }
}
