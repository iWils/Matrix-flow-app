import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { CreateGroupSchema } from '@/lib/validate'
import { UserGroupData, ApiResponse } from '@/types'

export async function GET() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized access attempt to user groups', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: '/api/admin/rbac/groups'
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    logger.info('Fetching user groups', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role
    })

    const userGroups = await prisma.userGroup.findMany({
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedGroups: UserGroupData[] = userGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      permissions: group.permissions as Record<string, string[]>,
      isActive: group.isActive,
      memberCount: group._count.members,
      createdAt: group.createdAt.toISOString()
    }))

    logger.info('User groups fetched successfully', {
      userId: parseInt(session.user.id as string),
      groupCount: formattedGroups.length
    })

    const response: ApiResponse<UserGroupData[]> = {
      success: true,
      data: formattedGroups
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching user groups', error as Error, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/rbac/groups'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized access attempt to create user group', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: '/api/admin/rbac/groups'
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Validation avec Zod
    const validationResult = CreateGroupSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid group creation data', {
        userId: parseInt(session.user.id as string),
        errors: validationResult.error.issues,
        body
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.issues[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { name, description, permissions } = validationResult.data

    logger.info('Creating new user group', {
      userId: parseInt(session.user.id as string),
      groupName: name,
      permissionsCount: Object.keys(permissions).length
    })

    // Vérifier si le nom existe déjà
    const existingGroup = await prisma.userGroup.findUnique({
      where: { name: name.trim() }
    })

    if (existingGroup) {
      logger.warn('Attempted to create group with existing name', {
        userId: parseInt(session.user.id as string),
        groupName: name,
        existingGroupId: existingGroup.id
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Un groupe avec ce nom existe déjà'
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const userGroup = await prisma.userGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        permissions: JSON.parse(JSON.stringify(permissions)),
        isActive: true
      }
    })

    logger.info('User group created successfully', {
      userId: parseInt(session.user.id as string),
      groupId: userGroup.id,
      groupName: userGroup.name
    })

    const newGroup: UserGroupData = {
      id: userGroup.id,
      name: userGroup.name,
      description: userGroup.description,
      permissions: userGroup.permissions as Record<string, string[]>,
      isActive: userGroup.isActive,
      memberCount: 0,
      createdAt: userGroup.createdAt.toISOString()
    }

    const response: ApiResponse<UserGroupData> = {
      success: true,
      data: newGroup,
      message: 'Groupe créé avec succès'
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error creating user group', error as Error, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/rbac/groups'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}