import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/user/organization - Get current user's organization ID
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's organization membership
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      organization_id: orgMember.organization_id,
      role: orgMember.role
    })

  } catch (error) {
    console.error('Error in GET /api/user/organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
