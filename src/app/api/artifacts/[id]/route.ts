import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('artifacts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (dbError || !data) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('artifacts')
    .delete()
    .eq('id', params.id)
    .select('id')
    .single()

  if (dbError || !data) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  return NextResponse.json({ deleted: true, id: params.id })
}
