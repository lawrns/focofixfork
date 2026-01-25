import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CursosRepository } from '@/lib/repositories/cursos-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { cursosRateLimiter, withRateLimit } from '@/lib/middleware/enhanced-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cursos/[slug]?workspaceId=xxx
 * Fetches a single course with sections by slug
 *
 * Rate Limited: 60 requests per minute per user/IP
 */
export const GET = withRateLimit(
  cursosRateLimiter,
  async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
  ) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const { slug } = params

    if (!workspaceId) {
      return mergeAuthResponse(
        NextResponse.json({ error: 'workspaceId is required' }, { status: 400 }),
        authResponse
      )
    }

    const repo = new CursosRepository(supabase)
    const courseResult = await repo.findBySlug(workspaceId, slug)

    if (!courseResult.ok) {
      const errorRes = databaseErrorResponse(courseResult.error.message, courseResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Get user's progress for this course
    const progressResult = await repo.getUserProgress(user.id, courseResult.data.id)

    const totalSections = courseResult.data.sections?.length || 0
    const completedSections = progressResult.ok ? (progressResult.data?.completed_section_ids?.length || 0) : 0
    const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

    const successRes = successResponse({
      course: courseResult.data,
      progress: progressResult.ok ? progressResult.data : null,
      progressPercentage,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('[Cursos Course API] Error:', error)
    return databaseErrorResponse('Failed to fetch course')
  }
}
)
