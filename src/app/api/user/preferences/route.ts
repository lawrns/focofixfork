import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase-client'
import type { UserPreferencesUpdate } from '@/lib/theme/types'
import { THEME_OPTIONS, ACCENT_COLORS, FONT_SIZE_OPTIONS } from '@/lib/theme/constants'

// Request body schema for updating preferences
const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto', 'high-contrast', 'sepia']).optional(),
  accent_color: z.enum(['blue', 'red', 'green', 'purple', 'pink', 'orange', 'yellow', 'teal', 'indigo', 'cyan', 'slate', 'amber']).optional(),
  font_size: z.enum(['small', 'medium', 'large']).optional(),
}).strict()

/**
 * GET /api/user/preferences
 * Get current user's theme preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('theme, accent_color, font_size')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json(
        { message: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      theme: profile?.theme || 'light',
      accent_color: profile?.accent_color || 'blue',
      font_size: profile?.font_size || 'medium',
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/preferences
 * Update user's theme preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = UpdatePreferencesSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid preferences provided', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updates: UserPreferencesUpdate = validationResult.data

    // Check if at least one preference is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No preferences to update' },
        { status: 400 }
      )
    }

    // Get current preferences first
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('theme, accent_color, font_size')
      .eq('user_id', user.id)
      .single()

    // Merge with existing preferences
    const mergedPreferences = {
      user_id: user.id,
      theme: updates.theme || currentProfile?.theme || 'light',
      accent_color: updates.accent_color || currentProfile?.accent_color || 'blue',
      font_size: updates.font_size || currentProfile?.font_size || 'medium',
      updated_at: new Date().toISOString(),
    }

    // Update in database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert(mergedPreferences)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { message: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      theme: mergedPreferences.theme,
      accent_color: mergedPreferences.accent_color,
      font_size: mergedPreferences.font_size,
      message: 'Preferences updated successfully',
    })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
