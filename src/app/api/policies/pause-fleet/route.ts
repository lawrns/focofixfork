import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({}))
  const action = body.action ?? 'pause'

  if (action !== 'pause' && action !== 'resume') {
    return NextResponse.json({ error: 'action must be "pause" or "resume"' }, { status: 400 })
  }

  const eventType = action === 'pause' ? 'fleet.pause' : 'fleet.resume'

  const { error: dbError } = await supabase
    .from('ledger_events')
    .insert({
      type: eventType,
      source: 'policy',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({
    paused: action === 'pause',
    updated_at: new Date().toISOString(),
  })
}
