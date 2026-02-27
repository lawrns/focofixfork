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

  // Fetch original run
  const { data: original, error: fetchError } = await supabase
    .from('runs')
    .select('runner, task_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Create new run as retry
  const { data, error: dbError } = await supabase
    .from('runs')
    .insert({
      runner: original.runner,
      task_id: original.task_id,
      status: 'pending',
      trace: { retried_from: params.id },
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
