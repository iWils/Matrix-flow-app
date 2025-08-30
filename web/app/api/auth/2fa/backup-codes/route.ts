import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { TwoFactorAuth } from '@/lib/auth/2fa';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Check if user has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, backupCodes: true }
    });

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    // Generate new backup codes
    const newBackupCodes = TwoFactorAuth.generateBackupCodes();
    const hashedBackupCodes = TwoFactorAuth.hashBackupCodes(newBackupCodes);

    // Update user's backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes: JSON.stringify(hashedBackupCodes)
      }
    });

    return NextResponse.json({
      success: true,
      backupCodes: newBackupCodes, // Return plain codes once for user to save
      message: 'New backup codes generated successfully'
    });

  } catch (error) {
    console.error('Backup codes generation error:', error);
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

    // Get backup codes count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twoFactorEnabled: true,
        backupCodes: true
      }
    });

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    const backupCodesCount = user.backupCodes 
      ? JSON.parse(user.backupCodes).length 
      : 0;

    return NextResponse.json({
      count: backupCodesCount
    });

  } catch (error) {
    console.error('Backup codes status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}