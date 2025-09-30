import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationName, userId } = body

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
      created_by: userId
    })

    if (!orgResult.success) {
      return NextResponse.json(
        { success: false, error: orgResult.error },
        { status: 400 }
      )
    }

    // Update user profile to include the organization_id
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        organization_id: orgResult.data!.id,
        display_name: '', // Will be updated later if needed
        email_notifications: true,
        theme_preference: 'system',
      })

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail the entire operation if profile update fails
      // The organization was created successfully
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: orgResult.data,
        message: 'Organization created and user profile updated successfully'
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
