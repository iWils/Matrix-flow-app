import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  try {
    const { username, email, fullName, password, role } = await req.json()

    // Validation
    if (!username?.trim() || !password?.trim()) {
      return new NextResponse('Username and password are required', { status: 400 })
    }

    if (password.length < 6) {
      return new NextResponse('Password must be at least 6 characters', { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          ...(email ? [{ email: email.trim() }] : [])
        ]
      }
    })

    if (existingUser) {
      return new NextResponse('User with this username or email already exists', { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email?.trim() || null,
        fullName: fullName?.trim() || null,
        passwordHash: hashedPassword,
        role: role || 'viewer',
        isActive: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      entity: 'User',
      entityId: user.id,
      action: 'create',
      changes: {
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
    
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}