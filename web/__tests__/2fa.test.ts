import { describe, test, expect, beforeEach, vi } from 'vitest'
import { TwoFactorAuth } from '../lib/auth/2fa'

describe('TwoFactorAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSecret', () => {
    test('should generate a secret', () => {
      const secret = TwoFactorAuth.generateSecret()
      expect(secret).toBeDefined()
      expect(typeof secret).toBe('string')
      expect(secret.length).toBeGreaterThan(0)
    })

    test('should generate different secrets each time', () => {
      const secret1 = TwoFactorAuth.generateSecret()
      const secret2 = TwoFactorAuth.generateSecret()
      expect(secret1).not.toBe(secret2)
    })
  })

  describe('generateBackupCodes', () => {
    test('should generate default number of backup codes (10)', () => {
      const codes = TwoFactorAuth.generateBackupCodes()
      expect(codes).toHaveLength(10)
      codes.forEach(code => {
        expect(typeof code).toBe('string')
        expect(code).toMatch(/^\d{8}$/) // 8-digit codes
      })
    })

    test('should generate custom number of backup codes', () => {
      const codes = TwoFactorAuth.generateBackupCodes(5)
      expect(codes).toHaveLength(5)
    })

    test('should generate unique backup codes', () => {
      const codes = TwoFactorAuth.generateBackupCodes(10)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(codes.length)
    })
  })

  describe('generateQRCode', () => {
    test('should generate QR code data URL', async () => {
      const email = 'test@example.com'
      const secret = 'JBSWY3DPEHPK3PXP'
      
      const qrCode = await TwoFactorAuth.generateQRCode(email, secret)
      
      expect(qrCode).toBeDefined()
      expect(qrCode).toContain('data:image/png;base64')
    })

    test('should throw error for invalid secret', async () => {
      const email = 'test@example.com'
      const secret = '' // Invalid secret
      
      await expect(TwoFactorAuth.generateQRCode(email, secret))
        .rejects.toThrow()
    })
  })

  describe('verifyToken', () => {
    test('should verify valid token', () => {
      // Using a known secret and token for testing
      const secret = 'JBSWY3DPEHPK3PXP'
      
      // Mock authenticator.check to return true for testing
      const mockCheck = vi.fn().mockReturnValue(true)
      vi.doMock('otplib', () => ({
        authenticator: {
          check: mockCheck,
          generateSecret: () => 'JBSWY3DPEHPK3PXP',
          keyuri: () => 'otpauth://totp/test'
        }
      }))
      
      const isValid = TwoFactorAuth.verifyToken('123456', secret)
      expect(isValid).toBe(true)
    })

    test('should reject invalid token', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      
      const mockCheck = vi.fn().mockReturnValue(false)
      vi.doMock('otplib', () => ({
        authenticator: {
          check: mockCheck,
          generateSecret: () => 'JBSWY3DPEHPK3PXP',
          keyuri: () => 'otpauth://totp/test'
        }
      }))
      
      const isValid = TwoFactorAuth.verifyToken('000000', secret)
      expect(isValid).toBe(false)
    })

    test('should handle token with spaces', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      
      const mockCheck = vi.fn().mockReturnValue(true)
      vi.doMock('otplib', () => ({
        authenticator: {
          check: mockCheck,
          generateSecret: () => 'JBSWY3DPEHPK3PXP',
          keyuri: () => 'otpauth://totp/test'
        }
      }))
      
      const isValid = TwoFactorAuth.verifyToken('123 456', secret)
      expect(isValid).toBe(true)
      expect(mockCheck).toHaveBeenCalledWith('123456', secret)
    })
  })

  describe('verifyBackupCode', () => {
    test('should verify valid backup code', () => {
      const backupCodes = ['12345678', '87654321', '11111111']
      const isValid = TwoFactorAuth.verifyBackupCode('12345678', backupCodes)
      expect(isValid).toBe(true)
    })

    test('should reject invalid backup code', () => {
      const backupCodes = ['12345678', '87654321', '11111111']
      const isValid = TwoFactorAuth.verifyBackupCode('99999999', backupCodes)
      expect(isValid).toBe(false)
    })

    test('should handle backup code with spaces', () => {
      const backupCodes = ['12345678', '87654321', '11111111']
      const isValid = TwoFactorAuth.verifyBackupCode('123 456 78', backupCodes)
      expect(isValid).toBe(true)
    })
  })

  describe('removeUsedBackupCode', () => {
    test('should remove used backup code', () => {
      const backupCodes = ['12345678', '87654321', '11111111']
      const remaining = TwoFactorAuth.removeUsedBackupCode('12345678', backupCodes)
      
      expect(remaining).toHaveLength(2)
      expect(remaining).not.toContain('12345678')
      expect(remaining).toContain('87654321')
      expect(remaining).toContain('11111111')
    })

    test('should handle code with spaces', () => {
      const backupCodes = ['12345678', '87654321', '11111111']
      const remaining = TwoFactorAuth.removeUsedBackupCode('123 456 78', backupCodes)
      
      expect(remaining).toHaveLength(2)
      expect(remaining).not.toContain('12345678')
    })

    test('should return original array if code not found', () => {
      const backupCodes = ['12345678', '87654321', '11111111']
      const remaining = TwoFactorAuth.removeUsedBackupCode('99999999', backupCodes)
      
      expect(remaining).toHaveLength(3)
      expect(remaining).toEqual(backupCodes)
    })
  })

  describe('hashBackupCodes', () => {
    test('should hash backup codes', () => {
      const codes = ['12345678', '87654321']
      const hashed = TwoFactorAuth.hashBackupCodes(codes)
      
      expect(hashed).toHaveLength(2)
      hashed.forEach(hash => {
        expect(typeof hash).toBe('string')
        expect(hash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex string
      })
      
      // Hashes should be different from original codes
      expect(hashed[0]).not.toBe(codes[0])
      expect(hashed[1]).not.toBe(codes[1])
    })

    test('should generate consistent hashes', () => {
      const codes = ['12345678']
      const hashed1 = TwoFactorAuth.hashBackupCodes(codes)
      const hashed2 = TwoFactorAuth.hashBackupCodes(codes)
      
      expect(hashed1[0]).toBe(hashed2[0])
    })
  })

  describe('verifyHashedBackupCode', () => {
    test('should verify hashed backup code', () => {
      const codes = ['12345678', '87654321']
      const hashed = TwoFactorAuth.hashBackupCodes(codes)
      
      const foundHash = TwoFactorAuth.verifyHashedBackupCode('12345678', hashed)
      expect(foundHash).toBe(hashed[0])
    })

    test('should return null for invalid code', () => {
      const codes = ['12345678', '87654321']
      const hashed = TwoFactorAuth.hashBackupCodes(codes)
      
      const foundHash = TwoFactorAuth.verifyHashedBackupCode('99999999', hashed)
      expect(foundHash).toBeNull()
    })

    test('should handle code with spaces', () => {
      const codes = ['12345678']
      const hashed = TwoFactorAuth.hashBackupCodes(codes)
      
      const foundHash = TwoFactorAuth.verifyHashedBackupCode('123 456 78', hashed)
      expect(foundHash).toBe(hashed[0])
    })
  })

  describe('formatManualEntryKey', () => {
    test('should format secret key for manual entry', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const formatted = TwoFactorAuth.formatManualEntryKey(secret)
      
      expect(formatted).toBe('JBSW Y3DP EHPK 3PXP')
    })

    test('should handle short secrets', () => {
      const secret = 'ABC'
      const formatted = TwoFactorAuth.formatManualEntryKey(secret)
      
      expect(formatted).toBe('ABC')
    })

    test('should handle empty secret', () => {
      const secret = ''
      const formatted = TwoFactorAuth.formatManualEntryKey(secret)
      
      expect(formatted).toBe('')
    })
  })
})