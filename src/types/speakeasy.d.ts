declare module 'speakeasy' {
  interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  interface GenerateSecretOptions {
    length?: number;
    name?: string;
    issuer?: string;
    symbols?: boolean;
    otpauth_url?: boolean;
    google_auth_qr?: boolean;
    qr_codes?: boolean;
  }

  interface TotpVerifyOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    window?: number;
    step?: number;
    counter?: number;
  }

  interface TotpOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    step?: number;
    time?: number;
    counter?: number;
    digits?: number;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
  }

  const speakeasy: {
    generateSecret(options?: GenerateSecretOptions): GeneratedSecret;
    totp(options: TotpOptions): string;
    totp: {
      verify(options: TotpVerifyOptions): boolean;
      verifyDelta(options: TotpVerifyOptions): { delta: number } | null;
    };
  };

  export default speakeasy;
}
