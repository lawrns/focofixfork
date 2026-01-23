import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TwoFactorSecret {
  secret: string;
  ascii: string;
  hex: string;
  base32: string;
  keyuri: string;
}

export interface TwoFactorSetupResponse {
  secret: TwoFactorSecret;
  qrCode: string;
  backupCodes: string[];
}

export class TwoFactorAuthService {
  /**
   * Generate a new TOTP secret for a user
   */
  static generateSecret(email: string, issuer: string = 'Foco'): TwoFactorSecret {
    try {
      const secret = speakeasy.generateSecret({
        name: `${issuer} (${email})`,
        issuer,
        length: 32,
      });

      return {
        secret: secret.base32,
        ascii: secret.ascii || '',
        hex: secret.hex || '',
        base32: secret.base32,
        keyuri: secret.otpauth_url || '',
      };
    } catch (error) {
      throw new Error('Failed to generate TOTP secret');
    }
  }

  /**
   * Generate QR code from TOTP keyuri
   */
  static async generateQRCode(keyuri: string): Promise<string> {
    try {
      if (!keyuri || !keyuri.startsWith('otpauth://')) {
        throw new Error('Invalid keyuri format');
      }

      const qrCode = await QRCode.toDataURL(keyuri, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCode;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(secret: string, token: string): boolean {
    try {
      if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
        throw new Error('Token must be 6 digits');
      }

      const verified = (speakeasy as any).totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 30 seconds before and after
      });

      return verified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  static generateBackupCodes(count: number = 10): string[] {
    try {
      const codes: string[] = [];

      for (let i = 1; i <= count; i++) {
        const randomPart = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()
          .padEnd(4, 'X');

        const code = `BACKUP-${String(i).padStart(3, '0')}-${randomPart}`;
        codes.push(code);
      }

      return codes;
    } catch (error) {
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Validate a backup code
   */
  static validateBackupCode(usedCodes: string[], backupCode: string): boolean {
    if (!backupCode) return false;

    const normalizedCode = backupCode.toUpperCase().trim();
    return !usedCodes.includes(normalizedCode);
  }

  /**
   * Mark backup code as used
   */
  static markBackupCodeAsUsed(usedCodes: string[], backupCode: string): string[] {
    const normalizedCode = backupCode.toUpperCase().trim();
    if (!usedCodes.includes(normalizedCode)) {
      usedCodes.push(normalizedCode);
    }
    return usedCodes;
  }
}
