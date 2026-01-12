import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';
import { TwoFactorAuthService } from '@/lib/services/two-factor-auth.service';

export async function POST(request: NextRequest) {
  try {
    const { id: userId, email, supabase } = await requireAuth();

    // Get user profile to check if 2FA is already enabled
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

    if (profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Generate secret and backup codes
    const secret = TwoFactorAuthService.generateSecret(email || 'user', 'Foco');
    const backupCodes = TwoFactorAuthService.generateBackupCodes(10);
    const qrCode = await TwoFactorAuthService.generateQRCode(secret.keyuri);

    return NextResponse.json({
      secret: secret.secret,
      keyuri: secret.keyuri,
      qrCode,
      backupCodes,
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}
