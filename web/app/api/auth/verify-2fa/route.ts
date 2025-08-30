import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TwoFactorAuth } from '@/lib/auth/2fa';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, code } = await request.json();

    if (!username || !code) {
      return NextResponse.json({ error: 'Username and code are required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        language: true,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA not enabled for this user' }, { status: 400 });
    }

    // Clean the code (remove spaces, etc.)
    const cleanCode = code.replace(/\s/g, '');

    let isValidCode = false;

    // First, try to verify as TOTP code
    if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
      isValidCode = TwoFactorAuth.verifyToken(cleanCode, user.twoFactorSecret);
    }

    // If TOTP failed, check if it's a backup code
    if (!isValidCode && user.backupCodes) {
      try {
        const backupCodes = JSON.parse(user.backupCodes);
        if (Array.isArray(backupCodes)) {
          // Check against hashed backup codes
          for (const hashedCode of backupCodes) {
            const isBackupCodeValid = await compare(cleanCode, hashedCode);
            if (isBackupCodeValid) {
              isValidCode = true;
              
              // Remove used backup code
              const updatedCodes = backupCodes.filter(code => code !== hashedCode);
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  backupCodes: JSON.stringify(updatedCodes)
                }
              });
              break;
            }
          }
        }
      } catch {
        // Invalid backup codes format, continue
      }
    }

    if (!isValidCode) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }

    // Update last 2FA usage
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id.toString(),
        email: user.email || user.username,
        name: user.fullName,
        role: user.role,
        language: user.language
      }
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}