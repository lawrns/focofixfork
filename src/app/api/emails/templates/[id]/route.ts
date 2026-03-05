import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (typeof body?.name === 'string') updates.name = body.name.trim()
  if (typeof body?.subject === 'string') updates.subject = body.subject.trim()
  if (typeof body?.body_md === 'string') updates.body_md = body.body_md
  if (body?.variables && typeof body.variables === 'object') updates.variables = body.variables

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (dbError || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', params.id)
    .select('id')
    .single()

  if (dbError || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  return NextResponse.json({ deleted: true, id: params.id })
}
