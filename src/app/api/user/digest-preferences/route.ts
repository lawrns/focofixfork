import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';

import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'

interface DigestTime {
  hour: number;
  minute: number;
}

interface ContentSelection {
  overdue: boolean;
  due_today: boolean;
  completed: boolean;
  comments: boolean;
}

interface DigestPreferences {
  frequency: 'none' | 'daily' | 'weekly';
  digestTime: DigestTime;
  digestDay: string;
  contentSelection: ContentSelection;
}

export async function PATCH(request: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(request);
    authResponse = response;

    if (authError || !user) {
      return mergeAuthResponse(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ), authResponse);
    }

    // Parse the request body
    const body = await request.json();
    const { digestPreferences } = body as { digestPreferences: DigestPreferences };

    if (!digestPreferences) {
      return NextResponse.json(
        { error: 'Missing digestPreferences in request body' },
        { status: 400 }
      );
    }

    // Validate digest preferences
    if (!['none', 'daily', 'weekly'].includes(digestPreferences.frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      );
    }

    if (digestPreferences.digestTime) {
      if (digestPreferences.digestTime.hour < 0 || digestPreferences.digestTime.hour > 23) {
        return NextResponse.json(
          { error: 'Invalid hour value (0-23)' },
          { status: 400 }
        );
      }
      if (digestPreferences.digestTime.minute < 0 || digestPreferences.digestTime.minute > 59) {
        return NextResponse.json(
          { error: 'Invalid minute value (0-59)' },
          { status: 400 }
        );
      }
    }

    // Get the user's workspace membership to update settings
    const { data: workspaceMembers, error: fetchError } = await supabase
      .from('workspace_members')
      .select('id, settings')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchError) {
      console.error('Error fetching workspace members:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user workspace membership' },
        { status: 500 }
      );
    }

    if (!workspaceMembers || workspaceMembers.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of any workspace' },
        { status: 404 }
      );
    }

    const workspaceMember = workspaceMembers[0];
    const currentSettings = (workspaceMember.settings as Record<string, unknown>) || {};

    // Create updated settings with digest preferences
    const updatedSettings: Record<string, unknown> = {
      ...currentSettings,
      digestPreferences: {
        frequency: digestPreferences.frequency,
        digest_time: digestPreferences.digestTime,
        digest_day: digestPreferences.digestDay || 'monday',
        content_selection: digestPreferences.contentSelection,
        updated_at: new Date().toISOString(),
      },
    };

    // Update workspace_members settings
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceMember.id);

    if (updateError) {
      console.error('Error updating digest preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to save digest preferences' },
        { status: 500 }
      );
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      message: 'Email digest preferences saved successfully',
    }), authResponse);
  } catch (error) {
    console.error('Error in digest preferences API:', error);
    return mergeAuthResponse(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ), authResponse);
  }
}

export async function GET(request: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(request);
    authResponse = response;

    if (authError || !user) {
      return mergeAuthResponse(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ), authResponse);
    }

    // Get the user's workspace membership settings
    const { data: workspaceMembers, error: fetchError } = await supabase
      .from('workspace_members')
      .select('settings')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchError) {
      console.error('Error fetching workspace members:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch digest preferences' },
        { status: 500 }
      );
    }

    if (!workspaceMembers || workspaceMembers.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of any workspace' },
        { status: 404 }
      );
    }

    const settings = (workspaceMembers[0].settings as Record<string, unknown>) || {};
    const digestPreferences = settings.digestPreferences || {
      frequency: 'none',
      digest_time: { hour: 9, minute: 0 },
      digest_day: 'monday',
      content_selection: {
        overdue: true,
        due_today: true,
        completed: true,
        comments: true,
      },
    };

    return mergeAuthResponse(NextResponse.json({ digestPreferences }), authResponse);
  } catch (error) {
    console.error('Error in digest preferences GET API:', error);
    return mergeAuthResponse(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ), authResponse);
  }
}
