import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get basic user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('full_name, email, avatar_url, role, is_active')
      .eq('id', userId)
      .single()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Get user preferences from user_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('bio, timezone, preferences')
      .eq('user_id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Combine user data with preferences
    const profile = {
      ...user,
      bio: userProfile?.bio || '',
      timezone: userProfile?.timezone || 'UTC',
      language: userProfile?.preferences?.language || 'en',
      preferences: userProfile?.preferences || {}
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const body = await request.json()
    const { full_name, avatar_url, timezone, language, bio } = body

    console.log('[Profile API] Update request body:', JSON.stringify({ full_name, avatar_url, timezone, language, bio }))

    const userId = request.headers.get('x-user-id')
    console.log('[Profile API] User ID from header:', userId)

    if (!userId) {
      console.error('[Profile API] No user ID in header - returning 401')
      return NextResponse.json({ error: 'Unauthorized - No user ID' }, { status: 401 })
    }

    // Update basic user info
    if (full_name !== undefined || avatar_url !== undefined) {
      const userUpdateData: any = {
        updated_at: new Date().toISOString()
      }

      if (full_name !== undefined) userUpdateData.full_name = full_name || null
      if (avatar_url !== undefined) userUpdateData.avatar_url = avatar_url || null

      console.log('[Profile API] Updating user table with:', JSON.stringify(userUpdateData))

      const { error: userError } = await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', userId)

      if (userError) {
        console.error('[Profile API] User update error:', userError)
        return NextResponse.json({ error: userError.message, details: userError }, { status: 400 })
      }
    }

    // Update user preferences in user_profiles
    if (timezone !== undefined || language !== undefined || bio !== undefined) {
      console.log('[Profile API] Updating user_profiles table')

      // Check if user profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('user_profiles')
        .select('id, preferences')
        .eq('user_id', userId)
        .single()

      console.log('[Profile API] Existing profile:', existingProfile, 'Error:', selectError)

      const preferences = existingProfile?.preferences || {}
      if (language !== undefined) {
        preferences.language = language
      }

      const profileUpdateData: any = {
        updated_at: new Date().toISOString()
      }

      if (bio !== undefined) profileUpdateData.bio = bio || null
      if (timezone !== undefined) profileUpdateData.timezone = timezone || null
      if (Object.keys(preferences).length > 0) {
        profileUpdateData.preferences = preferences
      }

      console.log('[Profile API] Profile update data:', JSON.stringify(profileUpdateData))

      if (existingProfile) {
        // Update existing profile
        console.log('[Profile API] Updating existing profile for user:', userId)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdateData)
          .eq('user_id', userId)

        if (profileError) {
          console.error('[Profile API] Profile update error:', profileError)
          return NextResponse.json({ error: profileError.message, details: profileError }, { status: 400 })
        }
      } else {
        // Create new profile
        console.log('[Profile API] Creating new profile for user:', userId)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            ...profileUpdateData
          })

        if (profileError) {
          console.error('[Profile API] Profile insert error:', profileError)
          return NextResponse.json({ error: profileError.message, details: profileError }, { status: 400 })
        }
      }
    }

    console.log('[Profile API] Profile update successful')
    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('[Profile API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
