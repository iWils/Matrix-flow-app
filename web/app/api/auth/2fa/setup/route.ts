import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { TwoFactorAuth } from '@/lib/auth/2fa';
import { z } from 'zod';

const SetupSchema = z.object({
  action: z.enum(['generate', 'verify', 'cancel'])
});

const VerifySchema = z.object({
  action: z.literal('verify'),
  token: z.string().min(6).max(6),
  secret: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { action } = SetupSchema.parse(body);

    // Check if user already has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, email: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'generate': {
        if (user.twoFactorEnabled) {
          return NextResponse.json({ error: '2FA already enabled' }, { status: 400 });
        }

        // Generate secret and QR code
        const secret = TwoFactorAuth.generateSecret();
        const userEmail = user.email || user.username;
        const qrCodeDataURL = await TwoFactorAuth.generateQRCode(userEmail, secret);
        const manualEntryKey = TwoFactorAuth.formatManualEntryKey(secret);

        return NextResponse.json({
          secret,
          qrCode: qrCodeDataURL,
          manualEntryKey,
          appName: 'Matrix Flow'
        });
      }

      case 'verify': {
        const { token, secret } = VerifySchema.parse(body);

        // Verify the token
        const isValid = TwoFactorAuth.verifyToken(token, secret);
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Generate backup codes
        const backupCodes = TwoFactorAuth.generateBackupCodes();
        const hashedBackupCodes = TwoFactorAuth.hashBackupCodes(backupCodes);

        // Enable 2FA for user
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorEnabled: true,
            twoFactorSecret: secret,
            backupCodes: JSON.stringify(hashedBackupCodes)
          }
        });

        return NextResponse.json({
          success: true,
          backupCodes, // Return plain codes once for user to save
          message: '2FA enabled successfully'
        });
      }

      case 'cancel': {
        // Nothing to do for cancel - just return success
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('2FA setup error:', error);
    
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

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null
      }
    });

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get 2FA status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twoFactorEnabled: true,
        backupCodes: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const backupCodesCount = user.backupCodes 
      ? JSON.parse(user.backupCodes).length 
      : 0;

    return NextResponse.json({
      enabled: user.twoFactorEnabled,
      backupCodesCount
    });

  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}