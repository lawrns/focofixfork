import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization ID from query params or use user's primary organization
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organizationId')

    if (orgId) {
      // Get specific organization
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single()

      if (orgError || !orgMember) {
        return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 })
      }

      // Get organization details
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('id, name, description, slug, logo_url, website, is_active, created_at, updated_at')
        .eq('id', orgMember.organization_id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ organization, role: orgMember.role })
    } else {
      // Get user's first organization (primary)
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)

      if (orgError || !orgMembers || orgMembers.length === 0) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 })
      }

      const orgMember = orgMembers[0]

      // Get organization details
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('id, name, description, slug, logo_url, website, is_active, created_at, updated_at')
        .eq('id', orgMember.organization_id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ organization, role: orgMember.role })
    }
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const body = await request.json()
    const { organizationId, name, description, slug, logo_url, website } = body

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine which organization to update
    const targetOrgId = organizationId

    if (!targetOrgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Get user's organization membership
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('organization_id', targetOrgId)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (slug !== undefined) updateData.slug = slug
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (website !== undefined) updateData.website = website

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', targetOrgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Organization settings updated successfully' })
  } catch (error) {
    console.error('Error updating organization settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
