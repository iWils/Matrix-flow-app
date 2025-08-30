import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Find user and check credentials
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
        passwordHash: true,
        role: true,
        language: true,
        isActive: true,
        twoFactorEnabled: true
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return whether 2FA is required
    return NextResponse.json({
      requires2FA: user.twoFactorEnabled,
      user: user.twoFactorEnabled ? null : {
        id: user.id.toString(),
        email: user.email || user.username,
        name: user.fullName,
        role: user.role,
        language: user.language
      }
    });

  } catch (error) {
    console.error('Check 2FA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}