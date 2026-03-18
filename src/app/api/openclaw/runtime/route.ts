import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { getOpenClawRuntimeSnapshot } from '@/lib/openclaw/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const snapshot = await getOpenClawRuntimeSnapshot()
  return mergeAuthResponse(NextResponse.json({ data: snapshot }), authResponse)
}
