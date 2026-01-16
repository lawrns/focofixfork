import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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
      console.error('Activity fetch error:', queryError)
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        data: data || [],
        pagination: { limit, offset, total: data?.length || 0 }
      }
    })
  } catch (err: any) {
    console.error('Activity API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
