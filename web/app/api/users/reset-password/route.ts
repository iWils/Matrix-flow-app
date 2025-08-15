import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  try {
    const { userId, newPassword } = await request.json()
    
    if (!userId || !newPassword) {
      return new NextResponse('Missing required fields', { status: 400 })
    }
    
    if (newPassword.length < 6) {
      return new NextResponse('Password must be at least 6 characters', { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        passwordHash: hashedPassword,
        lastPasswordChange: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastPasswordChange: true
      }
    })
    
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error resetting password:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}