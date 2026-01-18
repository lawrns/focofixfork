import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/requireAuth';
import { TwoFactorAuthService } from '@/lib/services/two-factor-auth.service';

export async function POST(request: NextRequest) {
  try {
    const { id: userId, email, supabase } = await requireAuth();

    // Check if 2FA is already enabled
    const { data: existingFactors, error: checkError } = await supabase
      .from('mfa_factors')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .limit(1);

    if (!checkError && (existingFactors?.length || 0) > 0) {
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
  } catch {
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}
