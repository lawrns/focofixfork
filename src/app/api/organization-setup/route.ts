import { NextRequest, NextResponse } from 'next/server'
import { OrganizationsService } from '@/lib/services/organizations'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
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

    // Update user profile to include the organization_id
    console.log('Updating user profile for user:', userId, 'with organization:', orgResult.data!.id)

    // Get user info from auth to get display name
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    let displayName = 'User'
    if (!userError && userData.user) {
      displayName = userData.user.user_metadata?.full_name ||
                   userData.user.user_metadata?.display_name ||
                   userData.user.email?.split('@')[0] ||
                   'User'
    }

    // Always try to upsert the profile - this handles both new and existing profiles
    const profileData = {
      id: userId,  // Use 'id' as the primary key matching the user ID
      user_id: userId,  // Also set user_id for compatibility
      organization_id: orgResult.data!.id,
      display_name: displayName,
      email_notifications: true,
      theme_preference: 'system',
      bio: null,
      preferences: {},
      settings: {},
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('Upserting profile with data:', profileData)

    // Use upsert to handle both insert and update cases
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()

    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      return NextResponse.json(
        { success: false, error: `Profile update failed: ${upsertError.message}` },
        { status: 400 }
      )
    }

    console.log('Profile upsert result:', upsertResult)

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
