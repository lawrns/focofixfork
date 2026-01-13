import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';

export async function POST(request: NextRequest) {
  try {
    const { id: userId, supabase } = await requireAuth();

    // Check if 2FA is enabled
    const { data: mfaFactors, error: checkError } = await supabase
      .from('mfa_factors')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .limit(1);

    if (checkError || !mfaFactors || mfaFactors.length === 0) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Delete all MFA factors for the user
    const { error: deleteError } = await supabase
      .from('mfa_factors')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to disable 2FA:', deleteError);
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
