import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TwoFactorAuth } from '@/lib/auth/2fa';
import { z } from 'zod';

const VerifySchema = z.object({
  userId: z.number(),
  token: z.string().min(6).max(8), // Allow backup codes (8 digits)
  isBackupCode: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token, isBackupCode = false } = VerifySchema.parse(body);

    // Get user's 2FA settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true
      }
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ 
        error: '2FA not enabled for this user' 
      }, { status: 400 });
    }

    let isValid = false;
    let updatedBackupCodes: string[] | null = null;

    if (isBackupCode && user.backupCodes) {
      // Verify backup code
      const backupCodes = JSON.parse(user.backupCodes);
      const usedBackupCode = TwoFactorAuth.verifyHashedBackupCode(token, backupCodes);
      
      if (usedBackupCode) {
        isValid = true;
        // Remove used backup code
        updatedBackupCodes = backupCodes.filter((code: string) => code !== usedBackupCode);
        
        // Update user's backup codes
        await prisma.user.update({
          where: { id: userId },
          data: {
            backupCodes: JSON.stringify(updatedBackupCodes)
          }
        });
      }
    } else {
      // Verify TOTP token
      isValid = TwoFactorAuth.verifyToken(token, user.twoFactorSecret);
    }

    if (!isValid) {
      return NextResponse.json({ 
        error: 'Invalid token or backup code' 
      }, { status: 400 });
    }

    // Return success with remaining backup codes count
    const remainingBackupCodes = updatedBackupCodes !== null 
      ? updatedBackupCodes.length
      : user.backupCodes 
        ? JSON.parse(user.backupCodes).length 
        : 0;

    return NextResponse.json({
      success: true,
      remainingBackupCodes,
      usedBackupCode: isBackupCode
    });

  } catch (error) {
    console.error('2FA verify error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}