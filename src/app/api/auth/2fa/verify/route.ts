import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';
import { TwoFactorAuthService } from '@/lib/services/two-factor-auth.service';

export async function POST(request: NextRequest) {
  try {
    const { id: userId, email, supabase } = await requireAuth();
    const body = await request.json();
    const { secret, token, backupCodes } = body;

    if (!secret || !token) {
      return NextResponse.json(
        { error: 'Missing secret or token' },
        { status: 400 }
      );
    }

    // Verify the TOTP token
    const isValidToken = TwoFactorAuthService.verifyToken(secret, token);

    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    // Save the secret and backup codes to the database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_backup_codes: backupCodes || [],
        two_factor_enabled_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save 2FA settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      twoFactorEnabled: true,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
