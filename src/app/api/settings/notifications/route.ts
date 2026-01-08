import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetNotificationSettingsSchema, UpdateNotificationSettingsSchema } from '@/lib/validation/schemas/settings-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'

// CONSOLIDATE: Merge into /api/user/settings/notifications
// This route is deprecated. Use /api/user/settings/notifications instead.
// Migration: GET/PUT /api/user/settings/notifications

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetNotificationSettingsSchema, async ({ user, correlationId }) => {
    // Get notification settings from user_profiles
    const { data: userProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      const err: any = new Error(error.message)
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Default settings
    const defaultSettings = {
      email_notifications: true,
      push_notifications: true,
      task_updates: true,
      project_updates: true,
      milestone_updates: true,
      team_mentions: true,
      daily_digest: false,
      weekly_summary: true
    }

    // Merge stored preferences with defaults
    const storedSettings = userProfile?.preferences?.notifications || {}
    const settings = { ...defaultSettings, ...storedSettings }

    return { settings }
  })(request)
}

export async function PUT(request: NextRequest) {
  return wrapRoute(UpdateNotificationSettingsSchema, async ({ input, user, correlationId }) => {
    const settings = input.body

    // Check if user profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, preferences')
      .eq('user_id', user.id)
      .single()

    const preferences = existingProfile?.preferences || {}
    preferences.notifications = settings

    const profileUpdateData = {
      preferences,
      updated_at: new Date().toISOString()
    }

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update(profileUpdateData)
        .eq('user_id', user.id)

      if (profileError) {
        const err: any = new Error(profileError.message)
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }
    } else {
      // Create new profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: user.id,
          ...profileUpdateData
        })

      if (profileError) {
        const err: any = new Error(profileError.message)
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }
    }

    return { success: true, message: 'Notification settings updated successfully' }
  })(request)
}
