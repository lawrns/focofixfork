import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';

export async function GET(request: NextRequest) {
  try {
    const { id: userId, email, supabase } = await requireAuth();

    // Check if user has MFA factors enabled
    const { data: mfaFactors, error: mfaError } = await supabase
      .from('mfa_factors')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .limit(1);

    const twoFactorEnabled = !mfaError && (mfaFactors?.length || 0) > 0;

    return NextResponse.json({
      userId: userId,
      email: email,
      twoFactorEnabled: twoFactorEnabled,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
