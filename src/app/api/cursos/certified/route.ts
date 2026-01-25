import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CursosRepository } from '@/lib/repositories/cursos-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { cursosCertificationRateLimiter, withRateLimit } from '@/lib/middleware/enhanced-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cursos/certified?workspaceId=xxx
 * Fetches all certified members for a workspace
 *
 * Rate Limited: 5 requests per hour per user/IP
 */
export const GET = withRateLimit(
  cursosCertificationRateLimiter,
  async function GET(request: NextRequest) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return mergeAuthResponse(
        NextResponse.json({ error: 'workspaceId is required' }, { status: 400 }),
        authResponse
      )
    }

    const repo = new CursosRepository(supabase)
    const result = await repo.getCertifiedMembers(workspaceId)

    if (!result.ok) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        members: result.data,
        total: result.data?.length || 0,
      }),
      authResponse
    )
  } catch (error) {
    console.error('[Cursos Certified API] Error:', error)
    return databaseErrorResponse('Failed to fetch certified members')
  }
}
)
