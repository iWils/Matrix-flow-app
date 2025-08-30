import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

export class TwoFactorAuth {
  private static readonly APP_NAME = 'Matrix Flow';
  private static readonly ISSUER = 'Matrix Flow';

  /**
   * Generate a new secret for TOTP
   */
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-digit backup codes
      const code = crypto.randomInt(10000000, 99999999).toString();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate QR code data URL for TOTP setup
   */
  static async generateQRCode(userEmail: string, secret: string): Promise<string> {
    const otpauth = authenticator.keyuri(
      userEmail,
      this.ISSUER,
      secret
    );

    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauth, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.check(token.replace(/\s/g, ''), secret);
    } catch {
      return false;
    }
  }

  /**
   * Verify backup code
   */
  static verifyBackupCode(code: string, backupCodes: string[]): boolean {
    const normalizedCode = code.replace(/\s/g, '');
    return backupCodes.includes(normalizedCode);
  }

  /**
   * Remove used backup code
   */
  static removeUsedBackupCode(usedCode: string, backupCodes: string[]): string[] {
    const normalizedCode = usedCode.replace(/\s/g, '');
    return backupCodes.filter(code => code !== normalizedCode);
  }

  /**
   * Hash backup codes for secure storage
   */
  static hashBackupCodes(codes: string[]): string[] {
    return codes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
  }

  /**
   * Verify hashed backup code
   */
  static verifyHashedBackupCode(code: string, hashedCodes: string[]): string | null {
    const codeHash = crypto.createHash('sha256').update(code.replace(/\s/g, '')).digest('hex');
    const foundHash = hashedCodes.find(hash => hash === codeHash);
    return foundHash || null;
  }

  /**
   * Generate manual entry key (formatted secret for manual input)
   */
  static formatManualEntryKey(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }
}

export default TwoFactorAuth;