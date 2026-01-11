import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'
import { supabaseAdmin } from '@/lib/supabase-server'

// CONSOLIDATE: Merge into /api/organizations POST
// This route is deprecated. Use POST /api/organizations with setup flag.
// Migration: POST /api/organizations body: { name, description, setup: true }

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API Route - Environment check:', {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'
    })

    const body = await request.json()
    const { organizationName, description, website, userId } = body

    if (!organizationName) {
      return NextResponse.json(
        { success: false, error: 'Organization name is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create the organization
    const orgResult = await OrganizationsService.createOrganization({
      name: organizationName.trim(),
      description: description?.trim() || null,
      website: website?.trim() || null,
      created_by: userId
    })

    if (!orgResult.success) {
      return NextResponse.json(
        { success: false, error: orgResult.error },
        { status: 400 }
      )
    }

    // Add user as organization member
    console.log('Adding user as organization member:', userId, 'to organization:', orgResult.data!.id)

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgResult.data!.id)
      .eq('user_id', userId)
      .single()

    if (!existingMember) {
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: orgResult.data!.id,
          user_id: userId,
          role: 'owner',
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Failed to add organization member:', memberError)
        return NextResponse.json(
          { success: false, error: `Failed to add user to organization: ${memberError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: orgResult.data,
        message: 'Organization created successfully'
      }
    })
  } catch (error) {
    console.error('Organization setup API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
