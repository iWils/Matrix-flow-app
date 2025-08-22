import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { ApiResponse } from '@/types'

export async function GET(req: NextRequest) {
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
    // Paramètres de pagination
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const skip = (page - 1) * limit
    
    logger.info('Fetching users', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      page,
      limit
    })

    const totalCount = await prisma.user.count()

    const users = await prisma.user.findMany({
      skip,
      take: limit,
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
      userId: parseInt(session.user.id as string),
      userCount: users.length,
      totalCount,
      page,
      hasMore: skip + users.length < totalCount
    })

    const response: ApiResponse<{
      users: typeof users,
      pagination: {
        page: number,
        limit: number,
        total: number,
        hasMore: boolean
      }
    }> = {
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: skip + users.length < totalCount
        }
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching users', error as Error, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/users'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}