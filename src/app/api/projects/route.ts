import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  if (!supabaseAdmin) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'DB not available' }, { status: 500 }),
      authResponse
    )
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '100')

  // Get user's workspace
  const { data: memberRow } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const workspaceId = memberRow?.workspace_id as string | undefined

  let query = supabaseAdmin
    .from('foco_projects')
    .select('id, name, slug, status, description')
    .order('name', { ascending: true })
    .limit(limit)

  if (workspaceId) query = query.eq('workspace_id', workspaceId)

  const { data, error: dbError } = await query

  if (dbError) {
    return mergeAuthResponse(
      NextResponse.json({ error: dbError.message }, { status: 500 }),
      authResponse
    )
  }

  return mergeAuthResponse(
    NextResponse.json({ data: { projects: data ?? [] } }),
    authResponse
  )
}
