import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_MODES = ['Reactive', 'Predictive', 'Guarded'] as const
type Mode = typeof VALID_MODES[number]

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ledger_events')
      .select('payload, timestamp')
      .eq('type', 'mode_change')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    const mode: Mode = (data?.payload as { mode?: string } | null)?.mode as Mode ?? 'Reactive'
    return NextResponse.json({ mode })
  } catch {
    return NextResponse.json({ mode: 'Reactive' })
  }
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { mode } = body

  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    await supabase.from('ledger_events').insert({
      type: 'mode_change',
      source: 'command_center',
      payload: { mode, changed_by: user.id },
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ mode })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
