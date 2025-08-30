import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { TwoFactorAuth } from '@/lib/auth/2fa';
import { hash } from 'bcryptjs';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        backupCodes: true,
        createdAt: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    const usersInfo = users.map((user: {
      id: number;
      fullName: string | null;
      email: string | null;
      role: string;
      twoFactorEnabled: boolean;
      backupCodes: string | null;
      createdAt: Date;
    }) => ({
      ...user,
      name: user.fullName,
      backupCodesCount: user.backupCodes ? JSON.parse(user.backupCodes).length : 0,
      backupCodes: undefined // Ne pas exposer les codes
    }));

    const stats = {
      totalUsers: users.length,
      users2FAEnabled: users.filter(u => u.twoFactorEnabled).length,
      users2FADisabled: users.filter(u => !u.twoFactorEnabled).length,
      percentage: users.length > 0 
        ? Math.round((users.filter(u => u.twoFactorEnabled).length / users.length) * 100)
        : 0
    };

    return NextResponse.json({
      users: usersInfo,
      stats
    });

  } catch (error) {
    console.error('Admin 2FA fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load 2FA data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { action, userId } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'disable') {
      // Désactiver la 2FA pour l'utilisateur
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null
        }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'regenerate-backup-codes') {
      if (!targetUser.twoFactorEnabled) {
        return NextResponse.json({ error: '2FA not enabled for this user' }, { status: 400 });
      }

      // Générer de nouveaux codes de récupération
      const backupCodes = TwoFactorAuth.generateBackupCodes();
      const hashedCodes = await Promise.all(
        backupCodes.map((code: string) => hash(code, 12))
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          backupCodes: JSON.stringify(hashedCodes)
        }
      });

      return NextResponse.json({ 
        success: true,
        codesCount: backupCodes.length
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Admin 2FA action error:', error);
    return NextResponse.json(
      { error: 'Failed to process 2FA action' },
      { status: 500 }
    );
  }
}