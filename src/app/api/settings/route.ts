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
    const { workspaceName, workspaceSlug, workspaceDescription } = body;

    // Update user_profiles settings
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        settings: {
          workspaceName,
          workspaceSlug,
          workspaceDescription,
        },
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
