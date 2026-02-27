import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data: cron, error: fetchError } = await supabase
    .from('crons')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !cron) {
    return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
  }

  // Create a run for this cron test
  const { data: run, error: runError } = await supabase
    .from('runs')
    .insert({
      runner: 'cron',
      status: 'pending',
      trace: { cron_id: params.id, handler: cron.handler, test: true },
    })
    .select()
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  return NextResponse.json({ data: run, cron }, { status: 201 })
}
