import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { insightsService } from '@/lib/services/insights.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId') ?? undefined

  try {
    const insights = await insightsService.getInsights(user.id, organizationId)
    return mergeAuthResponse(NextResponse.json(insights), authResponse)
  } catch (err: any) {
    console.error('Insights API error:', err)
    return mergeAuthResponse(
      NextResponse.json({ error: err.message || 'Failed to generate insights' }, { status: 500 }),
      authResponse
    )
  }
}
