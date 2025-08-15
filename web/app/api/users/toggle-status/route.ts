import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  try {
    const { userId, isActive } = await request.json()
    
    if (!userId || typeof isActive !== 'boolean') {
      return new NextResponse('Missing required fields', { status: 400 })
    }
    
    // Empêcher la désactivation de son propre compte
    if (session.user.id === parseInt(userId) && !isActive) {
      return new NextResponse('Cannot deactivate your own account', { status: 400 })
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isActive },
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
    console.error('Error toggling user status:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}