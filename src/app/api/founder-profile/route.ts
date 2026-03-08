import { NextRequest } from 'next/server'

import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, databaseErrorResponse, successResponse } from '@/lib/api/response-helpers'
import { loadFounderProfile } from '@/lib/cofounder-mode/founder-profile'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse
  try {
    const { user, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const founderProfile = await loadFounderProfile()

    return mergeAuthResponse(successResponse({
      founder_profile: founderProfile,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load founder profile', error), authResponse)
  }
}
