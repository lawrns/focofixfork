import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { buildMissionControlSnapshot } from '@/server/mission-control/snapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const snapshot = await buildMissionControlSnapshot({ req, user, supabase })
  return mergeAuthResponse(NextResponse.json({ data: snapshot }), authResponse)
}
