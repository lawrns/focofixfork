import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';

export async function GET(request: NextRequest) {
  try {
    const { id: userId, email, supabase } = await requireAuth();

    // Get user's 2FA status
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId: userId,
      email: email,
      twoFactorEnabled: profile?.two_factor_enabled || false,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
