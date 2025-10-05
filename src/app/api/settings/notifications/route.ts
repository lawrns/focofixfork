import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get notification settings from user_profiles
    const { data: userProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: error.message }, { status: 500 })
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

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()

    // Validate settings structure
    const validKeys = [
      'email_notifications',
      'push_notifications',
      'task_updates',
      'project_updates',
      'milestone_updates',
      'team_mentions',
      'daily_digest',
      'weekly_summary'
    ]

    const hasValidKeys = Object.keys(settings).every(key => validKeys.includes(key))
    if (!hasValidKeys) {
      return NextResponse.json({ error: 'Invalid settings keys' }, { status: 400 })
    }

    // Check if user profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, preferences')
      .eq('user_id', userId)
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
        .eq('user_id', userId)

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    } else {
      // Create new profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...profileUpdateData
        })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Notification settings updated successfully' })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
