import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SignJWT } from 'jose';
import { compare } from 'bcryptjs';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { username, password, verified2FA = false } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Find user and verify credentials
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if 2FA is required but not verified
    if (user.twoFactorEnabled && !verified2FA) {
      return NextResponse.json({ error: '2FA verification required' }, { status: 403 });
    }

    // Create session token
    const token = await new SignJWT({
      id: user.id.toString(),
      email: user.email || user.username,
      name: user.fullName,
      role: user.role,
      language: user.language
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('12h')
      .setIssuedAt()
      .sign(new TextEncoder().encode(JWT_SECRET));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.toString(),
        email: user.email || user.username,
        name: user.fullName,
        role: user.role,
        language: user.language
      },
      token
    });

  } catch (error) {
    console.error('Login with 2FA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}