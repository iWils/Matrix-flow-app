import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { User, ApiResponse } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized access attempt to users', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: '/api/users'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }
  
  try {
    logger.info('Fetching users', {
      userId: session.user.id,
      userRole: session.user.role
    })

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastPasswordChange: true,
        groupMemberships: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    logger.info('Users fetched successfully', {
      userId: session.user.id,
      userCount: users.length
    })

    const response: ApiResponse<typeof users> = {
      success: true,
      data: users
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching users', error as Error, {
      userId: session.user.id,
      endpoint: '/api/users'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}