import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';

export async function POST(request: NextRequest) {
  try {
    const { id: userId, supabase } = await requireAuth();

    // Get current user to verify 2FA is enabled
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled')
      .eq('id', userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 400 }
      );
    }

    if (!profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: [],
        two_factor_enabled_at: null,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to disable 2FA:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
      twoFactorEnabled: false,
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
