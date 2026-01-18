import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';
import { TwoFactorAuthService } from '@/lib/services/two-factor-auth.service';

export async function POST(request: NextRequest) {
  try {
    const { id: userId, email, supabase } = await requireAuth();
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    // Get user's 2FA secret
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_secret, two_factor_enabled, two_factor_backup_codes')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: 'User does not have 2FA enabled' },
        { status: 400 }
      );
    }

    // Try to verify TOTP token
    const isValidToken = TwoFactorAuthService.verifyToken(
      profile.two_factor_secret,
      token
    );

    if (isValidToken) {
      return NextResponse.json({
        success: true,
        message: 'Token verified successfully',
      });
    }

    // If TOTP token is invalid, try to verify as backup code
    const backupCodes = profile.two_factor_backup_codes || [];
    const isValidBackupCode = TwoFactorAuthService.validateBackupCode(
      backupCodes,
      token
    );

    if (isValidBackupCode) {
      // Mark the backup code as used
      const updatedCodes = TwoFactorAuthService.markBackupCodeAsUsed(
        [...backupCodes],
        token
      );

      // Update the database
      await supabase
        .from('user_profiles')
        .update({ two_factor_backup_codes: updatedCodes })
        .eq('id', userId);

      return NextResponse.json({
        success: true,
        message: 'Backup code verified successfully',
        warningMessage: `You have ${updatedCodes.length - backupCodes.length} backup codes remaining`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid token or backup code' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
