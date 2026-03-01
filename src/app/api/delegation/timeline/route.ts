import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DelegationService } from '@/features/delegation/delegationService'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const timeline = await DelegationService.getProjectTimeline(projectId, { limit, offset })

  return NextResponse.json({
    success: true,
    data: timeline,
    pagination: { limit, offset, has_more: timeline.length === limit }
  })
}
