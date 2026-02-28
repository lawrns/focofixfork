import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  // Derive fleet state from the most recent fleet.* ledger event
  const { data, error: dbError } = await supabase
    .from('ledger_events')
    .select('type, timestamp')
    .or('type.eq.fleet.pause,type.eq.fleet.resume')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const paused = data?.type === 'fleet.pause'

  return NextResponse.json({ paused })
}
