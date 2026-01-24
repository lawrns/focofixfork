import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CursosRepository } from '@/lib/repositories/cursos-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cursos/progress
 * Creates or updates user progress for a course
 *
 * Body: {
 *   courseId: string
 *   sectionId?: string  // If provided, marks section as completed
 *   lastPosition: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const body = await request.json()
    const { courseId, sectionId, lastPosition } = body

    if (!courseId) {
      return mergeAuthResponse(
        NextResponse.json({ error: 'courseId is required' }, { status: 400 }),
        authResponse
      )
    }

    const repo = new CursosRepository(supabase)

    let result
    if (sectionId) {
      // Mark section as complete
      result = await repo.markSectionComplete(user.id, courseId, sectionId)
    } else {
      // Just update position
      const currentResult = await repo.getUserProgress(user.id, courseId)
      const current = currentResult.ok ? currentResult.data : null

      result = await repo.upsertProgress(user.id, courseId, {
        completed_section_ids: current?.completed_section_ids || [],
        last_position: lastPosition || 0,
      })
    }

    if (!result.ok) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = successResponse({
      progress: result.data,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('[Cursos Progress API] Error:', error)
    return databaseErrorResponse('Failed to save progress')
  }
}
