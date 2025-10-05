import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const body = await request.json()
    const { name, description, allowPublicProjects, requireApproval, defaultVisibility } = body

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        name,
        description,
        settings: {
          allow_public_projects: allowPublicProjects,
          require_approval: requireApproval,
          default_visibility: defaultVisibility
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', orgMember.organization_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Organization settings updated successfully' })
  } catch (error) {
    console.error('Error updating organization settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
