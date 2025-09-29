import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id
    console.log('GET /api/organizations/[id] called with:', organizationId)

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get the organization details
    // For now, we'll use the admin client to bypass RLS since we need to check membership
    const { supabaseAdmin } = await import('@/lib/supabase-server')

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      console.error('Organization not found:', error)
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      )
    }

    console.log('Organization found:', organization)
    return NextResponse.json({
      success: true,
      data: organization
    })
  } catch (error) {
    console.error('GET /api/organizations/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}