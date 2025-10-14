import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetProfileSchema, UpdateProfileSchema } from '@/lib/validation/schemas/settings-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetProfileSchema, async ({ user, correlationId }) => {
    const supabase = supabaseAdmin

    // Get basic user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name, email, avatar_url, role, is_active')
      .eq('id', user.id)
      .single()

    if (userError) {
      const err: any = new Error(userError.message)
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Get user preferences from user_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('bio, timezone, preferences')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      const err: any = new Error(profileError.message)
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Combine user data with preferences
    const profile = {
      ...userData,
      bio: userProfile?.bio || '',
      timezone: userProfile?.timezone || 'UTC',
      language: userProfile?.preferences?.language || 'en',
      preferences: userProfile?.preferences || {}
    }

    return { profile }
  })(request)
}

export async function PUT(request: NextRequest) {
  return wrapRoute(UpdateProfileSchema, async ({ input, user, correlationId }) => {
    const supabase = supabaseAdmin
    const { full_name, avatar_url, timezone, language, bio } = input.body

    // Update basic user info
    if (full_name !== undefined || avatar_url !== undefined) {
      const userUpdateData: any = {
        updated_at: new Date().toISOString()
      }

      if (full_name !== undefined) userUpdateData.full_name = full_name || null
      if (avatar_url !== undefined) userUpdateData.avatar_url = avatar_url || null

      const { error: userError } = await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', user.id)

      if (userError) {
        const err: any = new Error(userError.message)
        err.code = 'DATABASE_ERROR'
        err.statusCode = 400
        throw err
      }
    }

    // Update user preferences in user_profiles
    if (timezone !== undefined || language !== undefined || bio !== undefined) {
      // Check if user profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('user_profiles')
        .select('id, preferences')
        .eq('user_id', user.id)
        .single()

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

      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdateData)
          .eq('user_id', user.id)

        if (profileError) {
          const err: any = new Error(profileError.message)
          err.code = 'DATABASE_ERROR'
          err.statusCode = 400
          throw err
        }
      } else {
        // Create new profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...profileUpdateData
          })

        if (profileError) {
          const err: any = new Error(profileError.message)
          err.code = 'DATABASE_ERROR'
          err.statusCode = 400
          throw err
        }
      }
    }

    return { success: true, message: 'Profile updated successfully' }
  })(request)
}
