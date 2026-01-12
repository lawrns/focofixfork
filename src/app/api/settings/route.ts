import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { workspaceName, workspaceSlug, workspaceDescription, aiPolicy, notifications } = body;

    // First, get the current settings
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current settings:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current settings' },
        { status: 500 }
      );
    }

    // Merge the new settings with existing settings
    const currentSettings = (currentProfile?.settings as Record<string, unknown>) || {};
    const updatedSettings: Record<string, unknown> = { ...currentSettings };

    // Update workspace settings if provided
    if (workspaceName !== undefined || workspaceSlug !== undefined || workspaceDescription !== undefined) {
      updatedSettings.workspaceName = workspaceName;
      updatedSettings.workspaceSlug = workspaceSlug;
      updatedSettings.workspaceDescription = workspaceDescription;
    }

    // Update AI policy settings if provided
    if (aiPolicy !== undefined) {
      updatedSettings.aiPolicy = aiPolicy;
    }

    // Update notification settings if provided
    if (notifications !== undefined) {
      updatedSettings.notifications = notifications;
    }

    // Update user_profiles settings
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
