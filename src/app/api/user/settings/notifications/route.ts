import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';

export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase-server';

interface NotificationSettings {
  enable_push: boolean;
  notify_task_assignments: boolean;
  notify_mentions: boolean;
  notify_project_updates: boolean;
  notify_deadlines: boolean;
  notify_team_members: boolean;
  notify_comments: boolean;
  notify_status_changes: boolean;
  enable_email: boolean;
  email_digest_frequency: string;
  enable_sound: boolean;
  show_badges: boolean;
}

const DEFAULT_SETTINGS: Omit<NotificationSettings, 'user_id'> = {
  enable_push: true,
  notify_task_assignments: true,
  notify_mentions: true,
  notify_project_updates: true,
  notify_deadlines: true,
  notify_team_members: false,
  notify_comments: true,
  notify_status_changes: true,
  enable_email: true,
  email_digest_frequency: 'daily',
  enable_sound: true,
  show_badges: true,
};

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get existing settings
    const { data: settings, error } = await supabaseAdmin
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification settings:', error);
      // Return defaults if table doesn't exist yet
      return NextResponse.json({ 
        success: true,
        data: { user_id: user.id, ...DEFAULT_SETTINGS }
      });
    }

    // Return settings or defaults
    return NextResponse.json({ 
      success: true,
      data: settings || { user_id: user.id, ...DEFAULT_SETTINGS }
    });
  } catch (error) {
    console.error('Error in GET /api/user/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Build update data from allowed fields
    const allowedFields = [
      'enable_push',
      'notify_task_assignments',
      'notify_mentions', 
      'notify_project_updates',
      'notify_deadlines',
      'notify_team_members',
      'notify_comments',
      'notify_status_changes',
      'enable_email',
      'email_digest_frequency',
      'enable_sound',
      'show_badges'
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Upsert settings (insert if not exists, update if exists)
    const { data, error } = await supabaseAdmin
      .from('user_notification_settings')
      .upsert(
        { user_id: user.id, ...updateData },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      data,
      message: 'Notification settings updated successfully' 
    });
  } catch (error) {
    console.error('Error in PUT /api/user/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
