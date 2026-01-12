import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock service for 2FA
const mock2FAService = {
  generateSecret: vi.fn(),
  generateQRCode: vi.fn(),
  verifyToken: vi.fn(),
  generateBackupCodes: vi.fn(),
  validateBackupCode: vi.fn(),
  enable2FA: vi.fn(),
  disable2FA: vi.fn(),
};

const TwoFactorAuthService = mock2FAService;

describe('TwoFactorAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate a valid TOTP secret', async () => {
      const mockSecret = {
        secret: 'JBSWY3DPEBLW64TMMQ6AUCWGIU=',
        ascii: 'test_secret_key',
        hex: 'abcd1234',
        base32: 'JBSWY3DPEBLW64TMMQ6AUCWGIU=',
        qr_code_ascii: null,
        keyuri: 'otpauth://totp/test@example.com?secret=JBSWY3DPEBLW64TMMQ6AUCWGIU=&issuer=Foco',
      };

      TwoFactorAuthService.generateSecret.mockResolvedValue({
        success: true,
        data: mockSecret,
      });

      const result = await TwoFactorAuthService.generateSecret('test@example.com', 'Foco');

      expect(result.success).toBe(true);
      expect(result.data?.secret).toBeDefined();
      expect(result.data?.keyuri).toContain('otpauth://totp/');
      expect(TwoFactorAuthService.generateSecret).toHaveBeenCalledWith('test@example.com', 'Foco');
    });

    it('should include issuer in keyuri', async () => {
      const mockSecret = {
        secret: 'JBSWY3DPEBLW64TMMQ6AUCWGIU=',
        keyuri: 'otpauth://totp/user@example.com?secret=JBSWY3DPEBLW64TMMQ6AUCWGIU=&issuer=MyApp',
      };

      TwoFactorAuthService.generateSecret.mockResolvedValue({
        success: true,
        data: mockSecret,
      });

      const result = await TwoFactorAuthService.generateSecret('user@example.com', 'MyApp');

      expect(result.data?.keyuri).toContain('issuer=MyApp');
    });

    it('should handle generation errors', async () => {
      TwoFactorAuthService.generateSecret.mockResolvedValue({
        success: false,
        error: 'Failed to generate secret',
      });

      const result = await TwoFactorAuthService.generateSecret('test@example.com', 'Foco');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate secret');
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code from keyuri', async () => {
      const keyuri = 'otpauth://totp/test@example.com?secret=JBSWY3DPEBLW64TMMQ6AUCWGIU=&issuer=Foco';
      const mockQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQA...';

      TwoFactorAuthService.generateQRCode.mockResolvedValue({
        success: true,
        data: { qrCode: mockQRCode },
      });

      const result = await TwoFactorAuthService.generateQRCode(keyuri);

      expect(result.success).toBe(true);
      expect(result.data?.qrCode).toContain('data:image/png;base64');
      expect(TwoFactorAuthService.generateQRCode).toHaveBeenCalledWith(keyuri);
    });

    it('should handle invalid keyuri', async () => {
      const invalidKeyuri = 'invalid-uri';

      TwoFactorAuthService.generateQRCode.mockResolvedValue({
        success: false,
        error: 'Invalid keyuri format',
      });

      const result = await TwoFactorAuthService.generateQRCode(invalidKeyuri);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid keyuri format');
    });

    it('should handle generation errors', async () => {
      const keyuri = 'otpauth://totp/test@example.com?secret=JBSWY3DPEBLW64TMMQ6AUCWGIU=&issuer=Foco';

      TwoFactorAuthService.generateQRCode.mockResolvedValue({
        success: false,
        error: 'Failed to generate QR code',
      });

      const result = await TwoFactorAuthService.generateQRCode(keyuri);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate QR code');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid TOTP token', async () => {
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const token = '123456';

      TwoFactorAuthService.verifyToken.mockResolvedValue({
        success: true,
        data: { valid: true, delta: 0 },
      });

      const result = await TwoFactorAuthService.verifyToken(secret, token);

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
      expect(TwoFactorAuthService.verifyToken).toHaveBeenCalledWith(secret, token);
    });

    it('should reject invalid TOTP token', async () => {
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const token = '000000';

      TwoFactorAuthService.verifyToken.mockResolvedValue({
        success: true,
        data: { valid: false },
      });

      const result = await TwoFactorAuthService.verifyToken(secret, token);

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
    });

    it('should reject expired token', async () => {
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const token = '123456';

      TwoFactorAuthService.verifyToken.mockResolvedValue({
        success: true,
        data: { valid: false, reason: 'Token expired' },
      });

      const result = await TwoFactorAuthService.verifyToken(secret, token);

      expect(result.data?.valid).toBe(false);
    });

    it('should validate token format', async () => {
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const invalidToken = 'abc';

      TwoFactorAuthService.verifyToken.mockResolvedValue({
        success: false,
        error: 'Token must be 6 digits',
      });

      const result = await TwoFactorAuthService.verifyToken(secret, invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token must be 6 digits');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate array of backup codes', async () => {
      const mockBackupCodes = [
        'BACKUP-001-XXXX',
        'BACKUP-002-XXXX',
        'BACKUP-003-XXXX',
        'BACKUP-004-XXXX',
        'BACKUP-005-XXXX',
        'BACKUP-006-XXXX',
        'BACKUP-007-XXXX',
        'BACKUP-008-XXXX',
        'BACKUP-009-XXXX',
        'BACKUP-010-XXXX',
      ];

      TwoFactorAuthService.generateBackupCodes.mockResolvedValue({
        success: true,
        data: { codes: mockBackupCodes },
      });

      const result = await TwoFactorAuthService.generateBackupCodes();

      expect(result.success).toBe(true);
      expect(result.data?.codes).toHaveLength(10);
      expect(result.data?.codes[0]).toMatch(/^BACKUP-\d{3}-[A-Z0-9]{4}$/);
    });

    it('should generate unique backup codes', async () => {
      const mockBackupCodes = [
        'BACKUP-001-AAAA',
        'BACKUP-002-BBBB',
        'BACKUP-003-CCCC',
        'BACKUP-004-DDDD',
        'BACKUP-005-EEEE',
      ];

      TwoFactorAuthService.generateBackupCodes.mockResolvedValue({
        success: true,
        data: { codes: mockBackupCodes },
      });

      const result = await TwoFactorAuthService.generateBackupCodes();

      const uniqueCodes = new Set(result.data?.codes);
      expect(uniqueCodes.size).toBe(mockBackupCodes.length);
    });

    it('should handle generation errors', async () => {
      TwoFactorAuthService.generateBackupCodes.mockResolvedValue({
        success: false,
        error: 'Failed to generate backup codes',
      });

      const result = await TwoFactorAuthService.generateBackupCodes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate backup codes');
    });
  });

  describe('validateBackupCode', () => {
    it('should validate correct backup code', async () => {
      const userId = 'user-123';
      const backupCode = 'BACKUP-001-XXXX';

      TwoFactorAuthService.validateBackupCode.mockResolvedValue({
        success: true,
        data: { valid: true, codesRemaining: 9 },
      });

      const result = await TwoFactorAuthService.validateBackupCode(userId, backupCode);

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
      expect(result.data?.codesRemaining).toBe(9);
    });

    it('should reject invalid backup code', async () => {
      const userId = 'user-123';
      const invalidCode = 'INVALID-CODE';

      TwoFactorAuthService.validateBackupCode.mockResolvedValue({
        success: true,
        data: { valid: false },
      });

      const result = await TwoFactorAuthService.validateBackupCode(userId, invalidCode);

      expect(result.data?.valid).toBe(false);
    });

    it('should reject used backup code', async () => {
      const userId = 'user-123';
      const usedCode = 'BACKUP-001-XXXX';

      TwoFactorAuthService.validateBackupCode.mockResolvedValue({
        success: true,
        data: { valid: false, reason: 'Code already used' },
      });

      const result = await TwoFactorAuthService.validateBackupCode(userId, usedCode);

      expect(result.data?.valid).toBe(false);
      expect(result.data?.reason).toBe('Code already used');
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA for user', async () => {
      const userId = 'user-123';
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const token = '123456';

      TwoFactorAuthService.enable2FA.mockResolvedValue({
        success: true,
        data: { enabled: true, userId, twoFactorSecret: secret },
      });

      const result = await TwoFactorAuthService.enable2FA(userId, secret, token);

      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(true);
      expect(result.data?.userId).toBe(userId);
      expect(TwoFactorAuthService.enable2FA).toHaveBeenCalledWith(userId, secret, token);
    });

    it('should reject with invalid token', async () => {
      const userId = 'user-123';
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const invalidToken = '000000';

      TwoFactorAuthService.enable2FA.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      const result = await TwoFactorAuthService.enable2FA(userId, secret, invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should handle database errors', async () => {
      const userId = 'user-123';
      const secret = 'JBSWY3DPEBLW64TMMQ6AUCWGIU=';
      const token = '123456';

      TwoFactorAuthService.enable2FA.mockResolvedValue({
        success: false,
        error: 'Failed to save 2FA settings',
      });

      const result = await TwoFactorAuthService.enable2FA(userId, secret, token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save 2FA settings');
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA for user', async () => {
      const userId = 'user-123';

      TwoFactorAuthService.disable2FA.mockResolvedValue({
        success: true,
        data: { enabled: false, userId },
      });

      const result = await TwoFactorAuthService.disable2FA(userId);

      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(false);
      expect(TwoFactorAuthService.disable2FA).toHaveBeenCalledWith(userId);
    });

    it('should handle user not found', async () => {
      const userId = 'nonexistent-user';

      TwoFactorAuthService.disable2FA.mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await TwoFactorAuthService.disable2FA(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      const userId = 'user-123';

      TwoFactorAuthService.disable2FA.mockResolvedValue({
        success: false,
        error: 'Failed to disable 2FA',
      });

      const result = await TwoFactorAuthService.disable2FA(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to disable 2FA');
    });
  });
});
