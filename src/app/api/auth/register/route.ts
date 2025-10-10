import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, email } = await request.json()

    if (!userId || !displayName) {
      return NextResponse.json(
        { success: false, error: 'User ID and display name are required' },
        { status: 400 }
      )
    }

    console.log('Creating user profile for:', { userId, displayName, email })

    // Create user profile using service role (bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        user_id: userId,
        display_name: displayName,
        email_notifications: true,
        theme_preference: 'system',
        bio: null,
        preferences: {},
        settings: {},
        timezone: 'UTC'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 500 }
      )
    }

    console.log('User profile created successfully for:', userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}