import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { authRequiredResponse, successResponse } from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { cursosRateLimiter, withRateLimit } from '@/lib/middleware/enhanced-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cursos/check-access?workspaceId=xxx
 * Checks if user has access to Cursos (must be @fyves.com)
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
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Get workspace details
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', workspaceId)
      .single()

    if (!workspace) {
      return mergeAuthResponse(
        NextResponse.json({
          success: true,
          authorized: false,
          reason: 'workspace_not_found'
        }),
        authResponse
      )
    }

    // Check if workspace is Fyves (slug: fyves-team)
    const isFyvesWorkspace = workspace.slug === 'fyves-team'

    // Check user's email domain
    const userEmailDomain = user.email?.split('@')[1]
    const isFyvesUser = userEmailDomain === 'fyves.com'

    const authorized = isFyvesWorkspace || isFyvesUser

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        authorized,
        reason: authorized ? undefined : 'not_fyves_domain',
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
      }),
      authResponse
    )
  } catch (error) {
    console.error('[Cursos Access] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check access' },
      { status: 500 }
    )
  }
}
)
