import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CursosRepository } from '@/lib/repositories/cursos-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { cursosRateLimiter, withRateLimit } from '@/lib/middleware/enhanced-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cursos?workspaceId=xxx
 * Fetches all published courses for a workspace with user progress
 *
 * Rate Limited: 60 requests per minute per user/IP
 */
export const GET = withRateLimit(
  cursosRateLimiter,
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
    const coursesResult = await repo.findPublishedByWorkspace(workspaceId)

    if (!coursesResult.ok) {
      const errorRes = databaseErrorResponse(coursesResult.error.message, coursesResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Get user's progress for each course
    const coursesWithProgress = await Promise.all(
      (coursesResult.data || []).map(async (course) => {
        const progressResult = await repo.getUserProgress(user.id, course.id)
        const progress = progressResult.ok ? progressResult.data : null

        const totalSections = course.sections?.length || 0
        const completedSections = progress?.completed_section_ids?.length || 0
        const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

        return {
          ...course,
          progress,
          completedSections,
          totalSections,
          progressPercentage,
          status: progressPercentage === 0 ? 'not_started' : progressPercentage === 100 ? 'completed' : 'in_progress',
        }
      })
    )

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        courses: coursesWithProgress,
        total: coursesWithProgress.length,
      }),
      authResponse
    )
  } catch (error) {
    console.error('[Cursos API] Error fetching courses:', error)
    return databaseErrorResponse('Failed to fetch courses')
  }
}
)
