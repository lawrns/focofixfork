import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: queryError.message }, { status: 500 }), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: {
        data: data || [],
        pagination: { limit, offset, total: data?.length || 0 }
      }
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ success: false, error: message }, { status: 500 }), authResponse)
  }
}
